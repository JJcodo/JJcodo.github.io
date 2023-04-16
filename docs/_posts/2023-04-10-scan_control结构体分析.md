---
layout: post
title: 从scan_control结构体的角度看内存回收
date: 2023-04-15 23:18 +0800
tag: [Linux内核, 结构体分析]
toc: true
---

scan结构体作为一个特殊的结构，贯穿整个kswapd的内存回收过程，本文将从scan_control结构体的角度来看内存回收过程。

### scan_control的定义

​		源代码中scan_control 结构体的每个成员的定义都有着详细的注释，这里为了使文章内存更加简短，删除了许多注释。

1、nr_to_reclaim的设置使用的是kswapd的高水线，其含义是kswapd应该回收多少内存，如果扫描的数量小于要回收的内存页就会增加回收的优先级。也就是priority的值会增加。

```c
kswapd_shrink_node
	sc->nr_to_reclaim += max(high_wmark_pages(zone), SWAP_CLUSTER_MAX);
	……………………………………
	return sc->nr_scanned >= sc->nr_to_reclaim;
```

2、target_mem_cgroup记录的是memcg根节点的memcg的地址,其设置路劲如下所示

```
shrink_node
	prepare_scan_count
		mem_cgroup_lruvec
			sc->target_mem_cgroup = root_mem_cgroup;
```

3、anon_cost和file_cost

```c
#define SWAP_CLUSTER_MAX 32UL
struct scan_control {
	unsigned long nr_to_reclaim;
	nodemask_t	*nodemask;
	struct mem_cgroup *target_mem_cgroup;
	unsigned long	anon_cost;
	unsigned long	file_cost;
#define DEACTIVATE_ANON 1
#define DEACTIVATE_FILE 2
	unsigned int may_deactivate:2;
	unsigned int force_deactivate:1;
	unsigned int skipped_deactivate:1;
	unsigned int may_writepage:1;
	unsigned int may_unmap:1;
	unsigned int may_swap:1;
	unsigned int proactive:1;
	unsigned int memcg_low_reclaim:1;
	unsigned int memcg_low_skipped:1;

	unsigned int hibernation_mode:1;
	unsigned int compaction_ready:1;
	unsigned int cache_trim_mode:1;
	unsigned int file_is_tiny:1;
	unsigned int no_demotion:1;
#ifdef CONFIG_LRU_GEN
	unsigned int memcgs_need_aging:1;
	unsigned long last_reclaimed;
#endif
	s8 order;
	s8 priority;
	s8 reclaim_idx;
	gfp_t gfp_mask;
	unsigned long nr_scanned;
	unsigned long nr_reclaimed;
	struct {
		unsigned int dirty;
		unsigned int unqueued_dirty;
		unsigned int congested;
		unsigned int writeback;
		unsigned int immediate;
		unsigned int file_taken;
		unsigned int taken;
	} nr;
	struct reclaim_state reclaim_state;
};
```

