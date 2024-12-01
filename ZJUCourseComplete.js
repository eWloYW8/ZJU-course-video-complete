// ==UserScript==
// @name         ZJUCourseComplete
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Quickly finish the video in courses.zju.edu.cn.
// @author       Yi Hao
// @match        *://courses.zju.edu.cn/course/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function createCustomAlert(message) {
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertContainer = document.createElement('div');
        alertContainer.className = 'custom-alert';
        alertContainer.innerHTML = `
            <div class="alert-content">
                <p>${message}</p>
                <button id="alert-close-btn">关闭</button>
            </div>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            .custom-alert {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                padding: 20px;
                z-index: 9999;
                animation: fadeIn 0.3s ease-in-out;
            }
            .custom-alert .alert-content {
                text-align: center;
            }
            .custom-alert p {
                font-size: 16px;
                margin-bottom: 20px;
            }
            .custom-alert button {
                padding: 10px 20px;
                font-size: 14px;
                background: #007BFF;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .custom-alert button:hover {
                background: #0056b3;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(style);

        alertContainer.querySelector('#alert-close-btn').addEventListener('click', () => {
            alertContainer.remove();
        });

        document.body.appendChild(alertContainer);
    }

    async function finishVideo(button) {
        const getdataUrl = 'https://courses.zju.edu.cn/api/activities/' + window.location.href.split('/').pop();
        const postUrl = 'https://courses.zju.edu.cn/api/course/activities-read/' + window.location.href.split('/').pop();
        const response = await fetch(getdataUrl);
        const data = await response.json();
        const length = data.uploads[0].videos[0].duration | 0;
        const chunkSize = 100;

        button.disabled = true;
        button.innerHTML = '<div class="loader"></div>';

        for (let start = 0; start < length; start += chunkSize) {
            const end = Math.min(start + chunkSize, length);

            await fetch(postUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "start": start,
                    "end": end
                })
            });

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        button.disabled = false;
        button.textContent = 'Finish Video';

        createCustomAlert('视频处理完成!');
    }

    async function init() {
        const style = document.createElement('style');
        style.innerHTML = `
            .loader {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007BFF;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                animation: spin 1s linear infinite;
                display: inline-block;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        const finishButton = document.createElement('button');
        finishButton.textContent = 'Finish Video';
        finishButton.style.position = 'fixed';
        finishButton.style.bottom = '10px';
        finishButton.style.right = '10px';
        finishButton.style.zIndex = '9999';
        finishButton.style.padding = '10px 20px';
        finishButton.style.backgroundColor = '#007BFF';
        finishButton.style.color = '#FFFFFF';
        finishButton.style.border = 'none';
        finishButton.style.borderRadius = '5px';
        finishButton.style.cursor = 'pointer';

        finishButton.addEventListener('click', () => {
            finishVideo(finishButton);
        });

        document.body.appendChild(finishButton);
    }

    init();
})();
