---
layout: post
title: swap_readpage函数注释
date: 2023-11-05 14:55:05 
last_modified_at: 2023-11-05 14:55:05 
tags: [Linux内核、函数注释]
author: Daniel
toc: true
description:增加函数的注释
---
# swap_readpage函数注释

增加函数的注释

```c
static struct swap_info_struct *swap_type_to_swap_info(int type)
{
	if (type >= MAX_SWAPFILES)
		return NULL;

	return READ_ONCE(swap_info[type]); /* rcu_dereference() */
}

/*
* 
*/
int swap_readpage(struct page *page, bool synchronous)
{
    struct bio *bio;
    int ret = 0;
    /*
    * 先根据page->private构造swp_entry_t结构，获取swap_type,并根据swap_type获取对应的swap_info_struct
    * 其中，swap_type由page->private左移SWP_TYPE_SHIFT位得到
    * SWP_TYPE_SHIFT是通过(BITS_PER_XA_VALUE - MAX_SWAPFILES_SHIFT)计算得来
    * #define BITS_PER_XA_VALUE	(BITS_PER_LONG - 1)， BITS_PER_LONG == 32
    * #define MAX_SWAPFILES_SHIFT	5 ，MAX_SWAPFILES_SHIFT定义了最大数量的swap_type
    * 而SWP_TYPE_SHIFT则是定义了每个swap_type最多能保存多少个页
    */
    struct swap_info_struct *sis = page_swap_info(page);
    blk_qc_t qc;
    struct gendisk *disk;
    unsigned long pflags;
 	/*
 	* 所有的frontswap_ops，判断该页是否在frontswap中
 	*/
​    if (frontswap_load(page) == 0) {
​        SetPageUptodate(page);
​        unlock_page(page);
​        goto out;
​    }
	/*
	* swapon
	*   ->setup_swap_map_and_extents
	        ->setup_swap_extents
	* 如果对应的fs实现了a_ops->swap_activate方法，则会带着SWP_ACTIVATED标志
	* 否则,则会带有SWP_FS_OPS标志
	*/
​    if (data_race(sis->flags & SWP_FS_OPS)) {
​        struct file *swap_file = sis->swap_file;
​        struct address_space *mapping = swap_file->f_mapping;

​        ret = mapping->a_ops->readpage(swap_file, page);
​        if (!ret)
​            count_vm_event(PSWPIN);
​        goto out;
​    }

​    if (sis->flags & SWP_SYNCHRONOUS_IO) {
         // 调用块设备的rw_page函数读取数据
​        ret = bdev_read_page(sis->bdev, swap_page_sector(page), page);
​        if (!ret) {
​            count_vm_event(PSWPIN);
​            goto out;
​        }
​    }
	/*
	* swap_file = file_open_name(name, O_RDWR|O_LARGEFILE, 0);
	* inode = swap_file->f_mapping->host
	* p->bdev_handle = bdev_open_by_dev(inode->i_rdev,BLK_OPEN_READ | BLK_OPEN_WRITE, p, NULL);
	* p->bdev = p->bdev_handle->bdev;
	*/
​    ret = 0;
​    bio = bio_alloc(GFP_KERNEL, 1);
​    bio_set_dev(bio, sis->bdev);
     // 执行的是读取操作 
​    bio->bi_opf = REQ_OP_READ;
     // 将bio结构中的I/O操作所涉及的逻辑扇区设置为page所表示的交换页面的扇区号
     //  page_swap_info(page) ---> swap_type == page_private(page) >> SWP_TYPE_SHIFT
     //                       ---> swap_offset == page_private(page) & SWP_OFFSET_MASK
​    bio->bi_iter.bi_sector = swap_page_sector(page);
     // I/O完成回调函数设置为end_swap_bio_read
​    bio->bi_end_io = end_swap_bio_read;
     // 将page所表示的页面添加到bio结构中，以进行与该页面相关的块I/O操作。
​    bio_add_page(bio, page, thp_size(page), 0);
	 // 
​    disk = bio->bi_bdev->bd_disk;
​    /*

	 * Keep this task valid during swap readpage because the oom killer may
	 * attempt to access it in the page fault retry time check.
	 */
	 if (synchronous) {
          // 提高优先级
	 	 bio->bi_opf |= REQ_HIPRI;
	 	 get_task_struct(current);
		 bio->bi_private = current;
	 }
	 count_vm_event(PSWPIN);
      // 增加bio的引用计数
	 bio_get(bio);
     // 提交bio，执行
	 qc = submit_bio(bio);
	 while (synchronous) {
		 set_current_state(TASK_UNINTERRUPTIBLE);
		 if (!READ_ONCE(bio->bi_private))
			 break;

	 if (!blk_poll(disk->queue, qc, true))
          // 将块设备层的I/O请求添加到内核的I/O调度器中进行调度
		 blk_io_schedule();
	 }
	 __set_current_state(TASK_RUNNING);
     // 减少对bio结构的引用计数
	 bio_put(bio);
out:
    psi_memstall_leave(&pflags);
    return ret;
}
```

