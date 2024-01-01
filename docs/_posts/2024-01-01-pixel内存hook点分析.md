---
layout: post
title: 内存相关的hook点记录
date: 2024-01-01 08:00:17 
last_modified_at: 2024-01-01 08:00:18
tags: [Linux内核]
author: Daniel
math: true
toc: true
description: 内存hook点相关函数记录
---
# 内存相关的hook点记录

```c
/*
使用blk_start_plug和blk_finish_plug提升IO性能,从而提升回收的性能？
*/

shrink_inactive_list
	trace_android_vh_shrink_inactive_list_blk_plug(&do_plug);
	if (do_plug)
		blk_start_plug(&plug);

	if (do_plug)
		blk_finish_plug(&plug);

shrink_lruvec
	trace_android_vh_shrink_lruvec_blk_plug(&do_plug);
	if (do_plug)
		blk_start_plug(&plug);

	if (do_plug)
		blk_finish_plug(&plug);

do_madvise
	trace_android_vh_do_madvise_blk_plug(behavior, &do_plug);
	if (do_plug)
		blk_start_plug(&plug);
	error = madvise_walk_vmas(mm, start, end, behavior,madvise_vma_behavior);
	if (do_plug)
		blk_finish_plug(&plug);

reclaim_pages
	trace_android_vh_reclaim_pages_plug(&do_plug);
	if (do_plug)
		blk_start_plug(&plug);
	// 回收内存
	if (do_plug)
		blk_finish_plug(&plug);
```



```c
/* 实现一个自己的page cache机制？需要通过暴露的符号进一步确认 */
pagecache_get_page
   	trace_android_vh_pagecache_get_page(mapping, index, fgp_flags,
					gfp_mask, page);
```



```c

/*
* 使用其他方式补充pcp list,异步还是申请特定区域的内存？
*/
get_populated_pcp_list
		trace_android_vh_rmqueue_bulk_bypass(order, pcp, migratetype, list);
		if (!list_empty(list))
			return list;
			
```



```c
/*
* 在某些情况下不flush tlb？什么情况？
*/
bool should_flush_tlb_when_young(void)
	trace_android_vh_ptep_clear_flush_young(&skip);


```



```c
/* 记录从buddy系统中分配的内存信息？ 如何使用*/
rmqueue
	trace_android_vh_rmqueue
```

​	android13

```c
android_vh_mmap_region
android_vh_tune_mmap_readaround
android_vh_try_to_unmap_one
android_vh_tune_scan_type
android_vh_vmpressure
android_vh_shrink_slab_bypass
android_rvh_set_balance_anon_file_reclaim
android_rvh_set_gfp_zone_flags
android_rvh_set_readahead_gfp_mask
android_rvh_set_skip_swapcache_flags
android_vh_mmap_region
android_vh_tune_inactive_ratio
android_vh_tune_scan_type
android_vh_tune_swappiness
```

