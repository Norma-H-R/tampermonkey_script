// ==UserScript==
// @name         crxs.me 小说一键下载器 - v2.1 (首行缩进排版版)
// @namespace    https://crxs.me
// @version      2.1
// @description  按p标签换行并注入全角双空格标准缩进，过滤导航。翻页完全依据导航栏链接数量判定：2个链接跳最后一个，1个链接则完结导出。
// @author       Anjou & AI
// @match        https://crxs.me/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    let novelTitle = '';
    let isProcessing = false;
    let chaptersCount = parseInt(sessionStorage.getItem('crxs_chapters_count') || '0', 10);

    function addButton() {
        if (document.getElementById('crxs-downloader')) return;

        const btn = document.createElement('button');
        btn.id = 'crxs-downloader';
        if (sessionStorage.getItem('crxs_is_running') === 'true') {
            btn.innerHTML = `⏳ 已抓取 ${chaptersCount} 章... (点击停止)`;
            btn.style.background = '#ff9900';
        } else {
            btn.innerHTML = '📥 一键下载整本小说 (TXT)';
            btn.style.background = '#e60000';
        }

        btn.style.cssText = `
            background: #249cb7;
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            padding: 15px 25px; color: white;
            border: none; border-radius: 8px; font-size: 17px; cursor: pointer;
            box-shadow: 0 6px 16px rgba(0,0,0,0.4); font-weight: bold;
        `;

        btn.onclick = function() {
            if (sessionStorage.getItem('crxs_is_running') === 'true') {
                stopDownload();
            } else {
                startDownload();
            }
        };
        document.body.appendChild(btn);
    }

    function getNovelTitle() {
        const titleEl = document.querySelector('.title');
        return titleEl ? titleEl.innerText.trim().replace(/ - .*成人小说网.*/, '') :
               (document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : '未知小说');
    }

    async function startDownload() {
        if (isProcessing) return;
        isProcessing = true;

        sessionStorage.setItem('crxs_is_running', 'true');
        sessionStorage.setItem('crxs_full_content', `《${getNovelTitle()}》\n\n`);
        sessionStorage.setItem('crxs_chapters_count', '0');

        executeCrawlSequence();
    }

    function stopDownload() {
        sessionStorage.removeItem('crxs_is_running');
        alert('已停止自动抓取。');
        window.location.reload();
    }

    async function executeCrawlSequence() {
        const btn = document.getElementById('crxs-downloader');
        if (btn) {
            btn.innerHTML = '⏳ 正在提取正文...';
            btn.disabled = true;
        }

        await extractCurrentChapter();
        setTimeout(findAndCrawlNext, 1200);
    }

    async function extractCurrentChapter() {
        chaptersCount++;
        let chapterTitle = `第${chaptersCount}章`;
        const chEl = document.querySelector('.chapter-title');
        if (chEl) chapterTitle = chEl.innerText.trim();

        let targetEl = document.querySelector('.fiction-body');
        if (!targetEl) {
            targetEl = document.querySelector('.content-box.fiction-content') || document.querySelector('.fiction-content');
        }

        let content = '';
        if (targetEl) {
            const cloneEl = targetEl.cloneNode(true);

            // 剔除正文内的导航文字
            const navsInContent = cloneEl.querySelectorAll('.fiction-chapter-navigator');
            navsInContent.forEach(nav => nav.remove());

            const pTags = cloneEl.querySelectorAll('p');
            if (pTags.length > 0) {
                let pTexts = [];
                pTags.forEach(p => {
                    let text = p.innerText.trim();
                    // 核心修改点：若段落不为空，强行挂载两个物理全角空格，实现首行缩进
                    if (text) pTexts.push('　　' + text);
                });
                content = pTexts.join('\n\n');
            } else {
                // 兜底处理：若无 p 标签则按换行切分后重组并注入全角缩进
                let rawLines = cloneEl.innerText.split('\n');
                let processedLines = [];
                rawLines.forEach(line => {
                    let text = line.trim();
                    if (text) processedLines.push('　　' + text);
                });
                content = processedLines.join('\n\n');
            }
        }

        content = content
            .replace(/\s*（看精彩成人小说上《成人小说网》：https:\/\/crxs\.me）/g, '')
            .replace(/色友点评[\s\S]*$/i, '')
            .replace(/https?:\/\/[^\s]+/g, '')
            .trim();

        let currentFullContent = sessionStorage.getItem('crxs_full_content') || '';
        currentFullContent += `\n\n=== ${chapterTitle} ===\n\n${content}\n\n`;

        sessionStorage.setItem('crxs_full_content', currentFullContent);
        sessionStorage.setItem('crxs_chapters_count', chaptersCount.toString());

        console.log(`✅ 本页抓取成功：${chapterTitle}`);
    }

    // 【全新翻页判定逻辑】
    function findAndCrawlNext() {
        const btn = document.getElementById('crxs-downloader');

        // 1. 只寻找基础类名
        const navBar = document.querySelector('.fiction-chapter-navigator');

        if (navBar) {
            // 2. 获取该导航栏下所有的 <a> 标签
            const links = navBar.querySelectorAll('a');

            // 3. 判定：如果有 2 个或更多的链接
            if (links.length >= 2) {
                // 点击最后一个链接
                const nextUrl = links[links.length - 1].href;

                if (nextUrl && nextUrl !== window.location.href && !nextUrl.includes('javascript')) {
                    if (btn) btn.innerHTML = `⏳ 已抓取 ${chaptersCount} 章 → 正在跳转...`;
                    setTimeout(() => window.location.href = nextUrl, 1000);
                    return; // 成功跳转，拦截后面的导出逻辑
                }
            }
        }

        // 判定为最后一章，执行导出
        finishDownload();
    }

    function finishDownload() {
        const btn = document.getElementById('crxs-downloader');
        if (btn) btn.innerHTML = `✅ 完成！共 ${chaptersCount} 章，正在下载...`;

        const finalContent = sessionStorage.getItem('crxs_full_content') || '无内容';
        const blob = new Blob([finalContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${getNovelTitle()}.txt`;
        a.click();

        URL.revokeObjectURL(url);

        sessionStorage.removeItem('crxs_is_running');
        sessionStorage.removeItem('crxs_full_content');
        sessionStorage.removeItem('crxs_chapters_count');

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = `✅ 下载完成！共 ${chaptersCount} 章`;
                btn.style.background = '#4CAF50';
                btn.disabled = false;
            }
        }, 2000);
    }

    window.addEventListener('load', () => {
        addButton();

        if (sessionStorage.getItem('crxs_is_running') === 'true') {
            setTimeout(executeCrawlSequence, 1500);
        }
    });
})();
