---
layout: post
title: pagein和pageout的流程梳理
date: 2023-09-30 20:15:40 
last_modified_at: 2023-09-30 20:15:40 
tags: []
author: Daniel
toc: true
description: 文章总结和分析linux内核中的pagein和pageout流程

---
# Pagein和pageout的流程梳理

​     pagein是将内存页从设备读入操作系统中，发生在页面的预读或者缺页的过程里，而pageout是将内存从操作系统写入到外部设备里，发生在页面的回收的过程。本文基于linux-5.15的代码总结这两个重要的流程。

匿名页的pageout流程

```c
shrink_inactive_list
    shrink_page_list
    	pageout(page, mapping)
		/*
		* mapping->a_ops->writepage是address_space_operations操作集
		* 他在init_swap_address_space函数当中进行初始化并使用swap_aops进行初始化函数
		* 因此，mapping->a_ops->writepage调用的实际上是swap_writepage函数
		*/
    		mapping->a_ops->writepage(page, &wbc);
				swap_writepage
                    __swap_writepage
                    	bdev_write_page
							// ops->rw_page是block_device_operations操作集
                    		 ops->rw_page
                    			zram_bvec_rw
                    				zram_bvec_write
                    					__zram_bvec_write
											// 压缩匿名页
											ret = zcomp_compress(zstrm, src, &comp_len);
											// 使用zs_malloc分配压缩内存
											handle = zs_malloc
											// 压缩之后的匿名页拷贝到对应的压缩页当中	
											memcpy(dst, src, comp_len);
/*
* 从mapping->a_ops->writepage到swap_writepage
*/
static const struct address_space_operations swap_aops = {
	.writepage	= swap_writepage,
	.set_page_dirty	= swap_set_page_dirty,
#ifdef CONFIG_MIGRATION
	.migratepage	= migrate_page,
#endif
};
init_swap_address_space
	space->a_ops = &swap_aops;

/*
* 从ops->rw_page 到zram_rw_page
*/
static const struct block_device_operations zram_devops = {
	.open = zram_open,
	.submit_bio = zram_submit_bio,
	.swap_slot_free_notify = zram_slot_free_notify,
	.rw_page = zram_rw_page,
	.owner = THIS_MODULE
};
```

pagein流程		

pagein流程发生在缺页异常当中

```c
do_page_fault
	__do_page_fault
		handle_mm_fault
				__handle_mm_fault
					handle_pte_fault
						do_swap_page
							swapin_readahead
								swap_vma_readahead
									__read_swap_cache_async
										find_get_page
											pagecache_get_page
									swap_readpage
										mapping->a_ops->readpage
										bdev_read_page
											ops->rw_page
												zram_bvec_rw
													zram_bvec_read
														__zram_bvec_read
															zram_get_handle
															zcomp_stream_get
															src = zs_map_object(zram->mem_pool, handle, ZS_MM_RO);
															memcpy(dst, src, PAGE_SIZE);

```



INTERVAL_TREE_DEFINE 

区间树，anon_vma就是使用区间树来管理各个相同的vma

page_referenced

函数作用是：返回page的引用计数，page的引用计数反映了一个page被多少个vma_struct引用，匿名页和文件页使用不同的遍历函数，匿名页使用rmap_walk_anon，文件页使用rmap_walk_file，使用不同函数遍历的原因是文件页和匿名页使用不同的结构保存page,因此需要使用不同的锁保护。

```c
struct rb_root_cached {
	struct rb_root rb_root;
	struct rb_node *rb_leftmost;
};

struct anon_vma {
	struct anon_vma *root;		/* Root of this anon_vma tree */
	struct rw_semaphore rwsem;	/* W: modification, R: walking the list */
	atomic_t refcount;
	unsigned long num_children;
	unsigned long num_active_vmas;
	struct anon_vma *parent;	/* Parent of this anon_vma */
	struct rb_root_cached rb_root;
};
                 
//rmap_walk_anon简介
rmap_walk_anon
  anon_vma = (struct anon_vma *)(page->mapping - PAGE_MAPPING_ANON);
  // 清楚PTE YOUNG的标志，这个标志会在清除的时候
  // handle_pte_fault--> entry = pte_mkyoung(entry);
  ptep_clear_flush_young_notify
  if (referenced)  // 如果page正在被其他vma引用，则不应该标记位idle状态
	clear_page_idle(page);  
  if (test_and_clear_page_young(page))
	referenced++;
```

匿名页是怎么管理page的



文件页是怎么管理page的

```c
struct address_space *page_mapping(struct page *page)
{
	struct address_space *mapping;

	page = compound_head(page);

	/* This happens if someone calls flush_dcache_page on slab page */
	if (unlikely(PageSlab(page)))
		return NULL;
	// 为什么使用unlikely修饰 
	if (unlikely(PageSwapCache(page))) {
		swp_entry_t entry;

		entry.val = page_private(page);
		return swap_address_space(entry);
	}

	mapping = page->mapping;
	if ((unsigned long)mapping & PAGE_MAPPING_ANON)
		return NULL;

	return (void *)((unsigned long)mapping & ~PAGE_MAPPING_FLAGS);
}
```

每个swap space 大小

```c
static unsigned int nr_swapfiles;
/* One swap address space for each 64M swap space */
#define SWAP_ADDRESS_SPACE_SHIFT	14
#define SWAP_ADDRESS_SPACE_PAGES	(1 << SWAP_ADDRESS_SPACE_SHIFT)
```

pageout流程参考文章

https://tinylab.org/linux-swap-and-zram/

http://www.wowotech.net/memory_management/zram.html
