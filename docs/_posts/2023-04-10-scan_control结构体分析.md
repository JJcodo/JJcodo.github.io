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

2、target_mem_cgroup记录的是要回收的目标memcg，目前此节点已经不再起作用的，他记录的是memcg根节点的memcg的地址,其设置路劲如下所示,但是这个节点是root节点。

```
shrink_node
	prepare_scan_count
		mem_cgroup_lruvec
			sc->target_mem_cgroup = root_mem_cgroup;
```

3、anon_cost和file_cost

​		`anon_cost`参数是指扫描匿名内存所需的成本，而`file_cost`参数是指扫描文件所需的成本。

 prepare_scan_count中使用共享的LRU链表设置scan_control的anon_cost和file_cost的值，对于anon_cost这个值，其越小会导致匿名页更容易被回收，越大会导致文件页越容易被回收。其生效的过程如下。

```c
/*
	在prepare_scan_count中对其进行初始化，赋值
*/
prepare_scan_count(){
    sc->anon_cost = target_lruvec->anon_cost;
	sc->file_cost = target_lruvec->file_cost;
}
/*
	在get_scan_count中被使用,
	目前一般使用swappiness来控制扫描文件页和匿名页的数量。
*/
get_scan_count(){
    
    total_cost = sc->anon_cost + sc->file_cost;
	anon_cost = total_cost + sc->anon_cost;
	file_cost = total_cost + sc->file_cost;
	total_cost = anon_cost + file_cost;

	ap = swappiness * (total_cost + 1);
	ap /= anon_cost + 1;

	fp = (200 - swappiness) * (total_cost + 1);
	fp /= file_cost + 1;

	fraction[0] = ap;
	fraction[1] = fp;
	denominator = ap + fp;
    			scan = mem_cgroup_online(memcg) ?
			       div64_u64(scan * fraction[file], denominator) :
			       DIV64_U64_ROUND_UP(scan * fraction[file],denominator);
}
```

3、 `may_deactivate`是一个长度为 2 位的无符号整型变量。两个位的变量可以用来表示四种状态的信息，分别是是否`deactivate`文件页（高位）和是否`deactivate`匿名页（低位），如果你需要deactivate匿名页的时候，使用或运算做标记（`sc->may_deactivate |= DEACTIVATE_ANON`）; 如果不需要deactivate匿名页，则需要使用与运算取消标记。（`sc->may_deactivate &= ~DEACTIVATE_ANON`）。

这个标志位在回收前会被标记，在shrink_list的过程中会被使用。

**回收内存前**， 在prepare_scan_count中

- 如果满足条件： LRU链表中的inactive的比例比较低的时候（`inactive_is_low(target_lruvec, LRU_INACTIVE_ANON)`）或者

最近在此LRU上发生了匿名页的访问的fault，则将sc->may_deactivate标记为DEACTIVATE_ANON，同理，文件页也同样如此。

- 如果sc->force_deactivate被标记为true时，sc->may_deactivate会同时被标为匿名页和文件的deactivate状态。

**回收过程中**

在`shrink_list()`的过程中，如果文件页或匿名页被`deactivate`，对应的active LRU链表就会被回收，否则，则会跳过对应的LRU链表（如果跳过了，skipped_deactivate则会被标记）。



4、**force_deactivate标志位**

在`do_try_to_free_pages()`中如果`sc->skipped_deactivate`标志位之前已经被标记过了，那么此时会被标记位`force_deactivate`状态。

5、**skipped_deactivate标志位**

如果在`shrink_list`过程中，如果跳过了对于activate_List的回收，那么这个标志位将会被标记位true，在`do_try_to_free_pages()`的过程当中，如果这个标记位被标记位true，那么force_deactivate标志位则会被标记位true，之后此标志位就会恢复位false状态。

6、

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





```c
static unsigned long shrink_zone(int priority, struct zone *zone,
                  struct scan_control *sc)
{
    unsigned long nr_reclaimed = 0;

    /* Check if we should reclaim only target cgroup */
    if (sc->target_mem_cgroup) {
        nr_reclaimed = shrink_mem_cgroup_zone(priority, zone,
                            sc->target_mem_cgroup,
                            sc->nr_scanned);
    } else {
        nr_reclaimed = shrink_zone_scan(zone, sc, priority);
    }

    /* ... */

    return nr_reclaimed;
}

```

