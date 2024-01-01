---
layout: post
title: 我的文章
date: 2023-12-31 14:34:39 
last_modified_at: 2023-12-31 14:34:39 
tags: []
author: Daniel
toc: true
description:文章描述
---
# PageFlagPrivate

```c
#define PAGE_FLAGS_PRIVATE				\
	(1UL << PG_private | 1UL << PG_private_2)

static inline int page_has_private(struct page *page)
{
	return !!(page->flags & PAGE_FLAGS_PRIVATE);
}
static inline void set_page_private(struct page *page, unsigned long private)
{
	page->private = private;
}
```

1、PagePrivate的标志位什么时候被设置？

当page->private被使用到的时候，也是值执行set_page_private的时候，比如以下情况：1、初始化zspage的时候，需要让zspage中每个page的page->private用来保存zspage的地址，使得每个页都可以使用page->private来访问对应的zspage。2、
