// ==UserScript==
// @name         crxs.me网页净化与阅读清爽化工具
// @namespace    https://crxs.me
// @version      1.0
// @description  自动删除指定的垃圾 class 和 id 节点，还你纯净阅读体验
// @author       Anjou
// @match        https://crxs.me/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 需要清理的 CSS 选择器列表（. 开头代表 class，# 开头代表 id）
    const targetSelectors = [
        '.z1-root',
        '.z2-root',
        '.z3-root',
        '#core-zone-8',
        '#core-zone-4',
        '#z-extra-1',
        '#z-extra-2',
        '#z-extra-4'
    ];

    // 核心清理函数
    function cleanPage() {
        targetSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.remove();
                console.log(`[净化成功] 已拦截并删除元素: ${selector}`);
            });
        });
    }

    // 1. 策略一：DOM刚构建时立刻清理（防止垃圾元素闪烁）
    document.addEventListener('DOMContentLoaded', cleanPage);

    // 2. 策略二：页面完全加载完后再次兜底清理（防止某些元素是通过异步动态加载出来的）
    window.addEventListener('load', cleanPage);

    // 3. 策略三：高级防动态注入（针对部分顽固广告，5秒内持续监控，冒头就杀）
    let counter = 0;
    const interval = setInterval(() => {
        cleanPage();
        counter++;
        if (counter > 10) clearInterval(interval); // 5秒后停止监控，节省电脑性能
    }, 500);

})();