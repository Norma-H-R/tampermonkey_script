// ==UserScript==
// @name         crxs.me 小说一键下载器 - v1.9 (完美排版版)
// @namespace    https://crxs.me
// @version      1.9
// @description  严格按指定class抓取，精准按p标签换行，自动剔除正文中的导航标签，修复跨页数据丢失Bug
// @author       Grok & AI
// @match        https://crxs.me/fiction/id-*
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

        // 1. 定位原始正文容器
        let targetEl = document.querySelector('.fiction-body');
        if (!targetEl) {
            targetEl = document.querySelector('.content-box.fiction-content') || document.querySelector('.fiction-content');
        }

        let content = '';
        if (targetEl) {
            // 2. 克隆一份节点到内存中操作
            const cloneEl = targetEl.cloneNode(true);
            
            // 3. 剔除内存节点中所有的导航标签
            const navsInContent = cloneEl.querySelectorAll('.fiction-chapter-navigator');
            navsInContent.forEach(nav => nav.remove());

            // 4. 【核心修复】精准提取所有 p 标签并手动换行
            const pTags = cloneEl.querySelectorAll('p');
            if (pTags.length > 0) {
                let pTexts = [];
                pTags.forEach(p => {
                    let text = p.innerText.trim();
                    if (text) pTexts.push(text); // 只有不为空的段落才加入
                });
                content = pTexts.join('\n\n'); // 段落之间用双换行隔开
            } else {
                // 兜底方案：如果没有p标签（有些网站直接用br换行），则回退到普通的换行处理
                content = cloneEl.innerText.trim().replace(/\n+/g, '\n\n');
            }
        }

        // 5. 文本后期清洗
        content = content
            .replace(/（看精彩成人小说上《成人小说网》：https:\/\/crxs\.me）/g, '')
            .replace(/色友点评[\s\S]*$/i, '')
            .replace(/https?:\/\/[^\s]+/g, '')
            .trim();

        // 6. 持久化拼接
        let currentFullContent = sessionStorage.getItem('crxs_full_content') || '';
        currentFullContent += `\n\n=== ${chapterTitle} ===\n\n${content}\n\n`;
        
        sessionStorage.setItem('crxs_full_content', currentFullContent);
        sessionStorage.setItem('crxs_chapters_count', chaptersCount.toString());

        console.log(`✅ 本页抓取成功（精细排版）：${chapterTitle}`);
    }

    function findAndCrawlNext() {
        const btn = document.getElementById('crxs-downloader');
        const navHasNext = document.querySelector('.fiction-chapter-navigator.has-next-rate-hint');
        
        if (navHasNext) {
            const links = navHasNext.querySelectorAll('a');
            if (links.length >= 2) {
                const nextUrl = links[1].href;
                if (nextUrl && nextUrl !== window.location.href && !nextUrl.includes('javascript')) {
                    if (btn) btn.innerHTML = `⏳ 已抓取 ${chaptersCount} 章 → 正在跳转...`;
                    setTimeout(() => window.location.href = nextUrl, 1000);
                    return;
                }
            }
        }

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
