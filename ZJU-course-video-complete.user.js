// ==UserScript==
// @name         ZJU Course Video Complete
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  快速完成课程视频观看进度
// @author       eWloYW8
// @match        https://courses.zju.edu.cn/course/*/learning-activity/full-screen*
// @run-at       document-idle
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 工具函数：等待元素出现
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let elapsed = 0;
            const timer = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(timer);
                    resolve(el);
                } else {
                    elapsed += interval;
                    if (elapsed >= timeout) {
                        clearInterval(timer);
                        reject(new Error("等待元素超时: " + selector));
                    }
                }
            }, interval);
        });
    }

    // 显示按钮上方的气泡提示
    function showTooltipAboveButton(button, message) {
        if (!(button instanceof HTMLElement)) {
            console.error('无效的按钮元素:', button);
            return;
        }

        // 先移除已有气泡
        const existing = document.querySelector('.zju-tooltip');
        if (existing) existing.remove();

        // 创建气泡
        const tooltip = document.createElement('div');
        tooltip.className = 'zju-tooltip';
        tooltip.textContent = message;

        // 添加基础样式
        Object.assign(tooltip.style, {
            position: 'fixed',
            padding: '6px 10px',
            backgroundColor: '#333',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            zIndex: '10000',
        });

        document.body.appendChild(tooltip);

        // 计算位置
        const rect = button.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        const top = rect.top - tooltipRect.height - 8;

        tooltip.style.left = `${Math.max(left, 8)}px`;
        tooltip.style.top = `${Math.max(top, 8)}px`;

        // 触发动画显示
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
        });

        // 自动消失
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.addEventListener('transitionend', () => {
                tooltip.remove();
            }, { once: true });
        }, 2500);
    }


    // 视频完成处理逻辑
    async function finishVideo(button) {
        const activityId = window.location.href.split('/').pop();
        const getUrl = `https://courses.zju.edu.cn/api/activities/${activityId}`;
        const postUrl = `https://courses.zju.edu.cn/api/course/activities-read/${activityId}`;

        button.disabled = true;
        button.innerHTML = '<div class="loader"></div>';

        try {
            const response = await fetch(getUrl);
            const data = await response.json();
            const length = data.uploads?.[0]?.videos?.[0]?.duration | 0;
            const chunkSize = 100;

            for (let start = 0; start < length; start += chunkSize) {
                const end = Math.min(start + chunkSize, length);
                await fetch(postUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ start, end })
                });
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            showTooltipAboveButton(button, '视频处理完成!');
        } catch (e) {
            console.error('[ZJU Course Complete] 处理失败:', e);
            showTooltipAboveButton(button, '处理失败，请重试！');
        } finally {
            button.disabled = false;
            button.textContent = 'Finish Video';
        }
    }

    // 注入按钮 + 样式
    async function injectFinishButton() {
        const style = document.createElement('style');
        style.innerHTML = `
            .loader {
                border: 2px solid #bbb;       /* 边框灰色和按钮边框色一致 */
                border-top: 2px solid #888;   /* 转动部分颜色稍深 */
                border-radius: 50%;
                width: 14px;
                height: 14px;
                animation: spin 1.2s linear infinite;
                display: inline-block;
                vertical-align: middle;       /* 居中对齐文本 */
                background-color: transparent; /* 保持透明背景 */
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            /* 让 .duration 内容横向排列，保持 inline 行内特性 */
            .duration.reset-padding.reset-margin.left.ng-scope.column-1-of-3 {
                display: inline-flex;
                align-items: center;
                gap: 6px; /* 控制“时长”与按钮间隔 */
            }

            .zju-finish-button {
                display: inline-block;
                font-size: 12px;
                padding: 2px 6px;
                background-color: transparent;
                color: #555;
                border: 1px solid #bbb;
                border-radius: 3px;
                cursor: pointer;
                white-space: nowrap;
                transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
            }
            .zju-finish-button:disabled {
                display: inline-block;
                font-size: 12px;
                padding: 2px 6px;
                background-color: transparent;
                color: #555;
                border: 1px solid #bbb;
                border-radius: 3px;
                cursor: pointer;
                white-space: nowrap;
                transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
            }

            .zju-finish-button:hover {
                background-color: #e6f0ff;
                color: #007BFF;
                border-color: #007BFF;
            }
            .zju-finish-button:hover:disabled {
                background-color: #e6f0ff;
                color: #007BFF;
                border-color: #007BFF;
            }
        `;
        document.head.appendChild(style);

        const button = document.createElement('button');
        button.textContent = '快速完成';
        button.className = 'zju-finish-button';
        button.addEventListener('click', () => finishVideo(button));

        try {
            const durationEl = await waitForElement('.duration.reset-padding.reset-margin.left.ng-scope.column-1-of-3', 8000);
            const valueSpan = durationEl.querySelector('.attribute-value');
            if (valueSpan) {
                durationEl.insertBefore(button, valueSpan);
            }
            console.log('[ZJU Course Complete] 成功将按钮插入视频信息右侧');
        } catch (e) {
            console.warn('[ZJU Course Complete] 未检测到视频信息');
        }
    }

    // 初始化逻辑
    window.addEventListener('load', () => {
        injectFinishButton();
    });

    window.addEventListener('hashchange', () => {
        console.log('[ZJU Course Complete] 监听到 hash 变化，重新注入按钮');
        injectFinishButton();
    });

})();
