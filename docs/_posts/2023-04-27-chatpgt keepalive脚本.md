---
layout: post
title:  chatgpt的keepalive脚本
tags: [脚本]
math: true
date: 2023-04-30 19:54:56
last_modified_at: 2023-04-30 19:54:56
---



### chat gpt的keep alive脚本

### 使用方法：

按下F12，打开开发者模式，将脚本复制到console运行即可

### 改造脚本：

```javascript
(function() {
  'use strict';
  const min = 30;
  const max = 60;
  var interval_time = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
  const sendRequest = () => {
    // 随机一个间隔, 最小30s, 最大60s
    interval_time = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
    console.log('下次的时间间隔是 ' + interval_time);
    fetch(window.location.href, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    }).then(response => {
      
      if (response.status === 403) {
        window.location.reload();
      }
    });
  };
  setInterval(sendRequest, interval_time);
})();
```



### 参考仓库地址：

[GitHub - zhdzb/chatGPT-keepBreath: chatgpt经常因为断开连接需要刷新，简单的使用油猴脚本定期检测其连接状态，保持网页活性，如果连接中断自动刷新。](https://github.com/zhdzb/chatGPT-keepBreath)

### 参考脚本：

```javascript
/ ==UserScript==
// @name         判断gpt呼吸
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://chat.openai.com/c/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  // 请求间隔时间（单位：毫秒）
  const INTERVAL_TIME = 1000 * 30 * 1;
  console.log('开始计时' + INTERVAL_TIME + 'ms');
  // 发送请求函数
  const sendRequest = () => {
    fetch(window.location.href, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    }).then(response => {
      // 如果状态码为 403，刷新页面
      console.log('发送呼吸请求');
      if (response.status === 403) {
        window.location.reload();
      } else {
        console.log(response.status + '：当前处于呼吸状态');
      }
    });
  };

  // 判断页面状态并执行不同方案
  if (document.visibilityState === 'visible') {
    // 如果处于可见状态，立即发送请求并定时发送请求
    setInterval(sendRequest, INTERVAL_TIME);
  } else {
    // 如果处于隐藏状态，每 30 分钟发送一个请求
    console.log('当前处于后台，30分钟发送给一个请求保持网页活动');
    setInterval(sendRequest, INTERVAL_TIME);
  }

  // 添加可见性状态改变事件的监听器
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 如果处于可见状态，立即发送请求并定时发送请求
      sendRequest();
      setInterval(sendRequest, INTERVAL_TIME);
    } else {
      // 如果处于隐藏状态，每 30 分钟发送一个请求
      console.log('当前处于后台，秒发送给一个请求保持网页活动');
      setInterval(sendRequest, INTERVAL_TIME);
    }
  });
})();
```

