// ==UserScript==
// @name         iwara下载助手
// @namespace    https://github.com/dawn-lc/user.js
// @version      1.1.2
// @description  批量下载iwara视频
// @author       dawn-lc
// @match        https://ecchi.iwara.tv/users/*
// @match        https://ecchi.iwara.tv/videos*
// @exclude      https://ecchi.iwara.tv/videos/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_download
// @grant        GM_openInTab
// ==/UserScript==
(function () {


    //常用函数库
    const library = {
        Net: {
            get(url, parameter, referrer) {
                referrer = referrer || window.location.href;
                parameter = parameter || [];
                if (parameter.length != 0) {
                    url += '?';
                    for (var key in parameter) {
                        url += key + '=' + parameter[key] + '&';
                    };
                    url = url.substr(0, url.length - 1);
                }
                return fetch(url, {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "cache-control": "no-cache",
                        "content-type": "application/x-www-form-urlencoded",
                    },
                    "referrer": referrer,
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "redirect": "follow",
                    "credentials": "include"
                });
            },
            post(url, parameter, referrer) {
                referrer = referrer || window.location.href;
                if (typeof parameter == 'object') parameter = JSON.stringify(parameter);
                return fetch(url, {
                    "headers": {
                        "accept": "application/json, text/plain, */*",
                        "cache-control": "no-cache",
                        "content-type": "application/x-www-form-urlencoded",
                    },
                    "referrer": "https://ecchi.iwara.tv/videos?page=0",
                    "body": parameter,
                    "method": "POST",
                    "mode": "cors",
                    "redirect": "follow",
                    "credentials": "include"
                });
            },
            getQueryVariable(query, variable) {
                let vars = query.split("&");
                for (let i = 0; i < vars.length; i++) {
                    let pair = vars[i].split("=");
                    if (pair[0] == variable) { return pair[1]; };
                };
                return (false);
            }
        },
        UUID: {
            new() {
                let UUID;
                for (let index = 0; index < 8; index++) {
                    UUID += (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
                }
                return UUID;
            }
        },
        Dom: {
            createElement(detailedList) {
                if (detailedList instanceof Array) {
                    return detailedList.map(item => this.createElement(item));
                } else {
                    return this.generateElement(document.createElement(detailedList.nodeType), detailedList);
                };
            },
            generateElement(item, detailedList) {
                for (const i in detailedList) {
                    if (i == 'nodeType') continue;
                    if (i == 'childs' && detailedList.childs instanceof Array) {
                        detailedList.childs.forEach(child => {
                            if (child instanceof HTMLElement) item.appendChild(child);
                            else if (typeof (child) == 'string') item.insertAdjacentHTML('beforeend', child);
                            else item.appendChild(this.createElement(child));
                        });
                    } else if (i == 'attribute') {
                        for (const key in detailedList.attribute) {
                            item.setAttribute(key, detailedList.attribute[key]);
                        };
                    } else if (i == 'parent') {
                        detailedList.parent.appendChild(item);
                    } else if (i == 'before') {
                        switch (typeof detailedList.before) {
                            case 'object':
                                if (detailedList.before instanceof HTMLElement) {
                                    detailedList.before.insertBefore(item, detailedList.before.childNodes[0]);
                                } else {
                                    console.error("before节点异常！");
                                };
                                break;
                            case 'string':
                                try {
                                    if (eval(detailedList.before) instanceof HTMLElement) {
                                        eval(detailedList.before).insertBefore(item, eval(detailedList.before).childNodes[0]);
                                    } else {
                                        if (document.querySelector(detailedList.before)) {
                                            document.querySelector(detailedList.before).insertBefore(item, document.querySelector(detailedList.before).childNodes[0]);
                                        };
                                    };
                                } catch (error) {
                                    console.error("计算before节点失败" + error);
                                };
                                break;
                            default:
                                console.error("未知的before节点类型");
                                break;
                        }
                    } else if (detailedList[i] instanceof Object && item[i]) {
                        Object.entries(detailedList[i]).forEach(([k, v]) => {
                            item[i][k] = v;
                        });
                    } else {
                        item[i] = detailedList[i];
                    };
                };
                return item;
            },
            moveElement(newElement, oldElement, isMovechildNode = false) {
                if (isMovechildNode) {
                    NodeList.prototype.forEach = Array.prototype.forEach;
                    oldElement.childNodes.forEach(function (item) {
                        newElement.appendChild(item.cloneNode(true));
                    });
                };
                oldElement.parentNode.replaceChild(newElement,oldElement);
            },
            parseDom(dom) {
                return new DOMParser().parseFromString(dom, 'text/html');
            },
            addClass(node, className) {
                if (!node.classList.contains(className)) {
                    node.classList.add(className);
                    node.offsetWidth = node.offsetWidth;
                };
            },
            removeClass(node, className) {
                if (node.classList.contains(className)) {
                    node.classList.remove(className);
                    node.offsetWidth = node.offsetWidth;
                };
            },
            clearClass(node) {
                node.classList = null;
                node.offsetWidth = node.offsetWidth;
            }
        }
    };

    const type = {
        Download: {
            //aria2
            aria2: 0,
            //默认
            default: 1,
            //其他
            others: 2
        }
    };

    const setting = {
        Initialize: GM_getValue("Initialize", false),
        DownloadType: GM_getValue("DownloadType", type.Download.default),
        DownloadDir: GM_getValue("DownloadDir", ''),
        DownloadProxy: GM_getValue("DownloadProxy", ''),
        WebSocketAddress: GM_getValue("WebSocketAddress", 'ws://127.0.0.1:6800/'),
        WebSocketToken: GM_getValue("WebSocketToken", ''),
        WebSocketID: GM_getValue("WebSocketID", library.UUID.new()),
        setInitialize(value) {
            this.Initialize = value;
            GM_setValue("Initialize", this.Initialize);
        },
        setDownloadType(value) {
            this.DownloadType = Number(value);
            GM_setValue("DownloadType", this.DownloadType);
        },
        setDownloadDir(value) {
            this.DownloadDir = value;
            GM_setValue("DownloadDir", this.DownloadDir);
        },
        setDownloadProxy(value) {
            this.DownloadProxy = value;
            GM_setValue("DownloadProxy", this.DownloadProxy);
        },
        setWebSocketAddress(value) {
            this.WebSocketAddress = value;
            GM_setValue("WebSocketAddress", this.WebSocketAddress);
        },
        setWebSocketToken(value) {
            this.WebSocketToken = value;
            GM_setValue("WebSocketToken", this.WebSocketToken);
        }
    };

    const resources = {
        PluginUI: [{
            nodeType: 'style',
            innerHTML: `
            .selectButton {
                -moz-user-select:none; /*火狐*/
                -webkit-user-select:none; /*webkit浏览器*/
                -ms-user-select:none; /*IE10*/
                -khtml-user-select:none; /*早期浏览器*/
                user-select:none;
                position: relative;
                width: 100%;
                height: 100%;
            }
            .selectButton[isselected=true]:before {
                position: absolute;
                display: block;
                width: 100%;
                height: 100%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(150,150,150,0.6);
                content: '';
                
            }
            .selectButton[isselected=true]:after {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(1.32,0.96);
                font-weight: 900;
                font-size: 36px;
                color: rgb(20,20,20);
                content: '√';
            }
            .controlPanel {
                display: none; /* 默认隐藏 */
                position: fixed; /* 固定定位 */
                z-index: 9999; /* 设置在顶层 */
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
                scrollbar-width: none; /* firefox */
                -ms-overflow-style: none; /* IE 10+ */
                overflow-x: hidden;
                overflow-y: auto;
            }
            .controlPanel::-webkit-scrollbar {
                display: none; /* Chrome Safari */
            }
            /* 弹窗内容 */
            .controlPanel-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 60%;
                max-width: 720px;
            }
            /* 关闭按钮 */
            .controlPanelClose {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .controlPanelClose:hover,
            .controlPanelClose:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }`,
            parent: document.head
        }, {
            nodeType: 'div',
            id: 'PluginUI',
            className: 'btn-group',
            childs: [{
                nodeType: 'button',
                type: 'button',
                id: 'PluginUIStartUp',
                title: '下载助手',
                className: 'btn btn-primary btn-sm dropdown-toggle',
                childs: [{
                    nodeType: 'span',
                    className: 'glyphicon glyphicon-download-alt'
                }, {
                    nodeType: 'text',
                    innerHTML: '下载助手'
                }],
                onclick: function () {
                    if (this.parentNode.classList.contains("open")) {
                        this.parentNode.classList.remove("open");
                    } else {
                        this.parentNode.classList.add("open");
                    };
                }
            },
            {
                nodeType: 'ul',
                className: 'dropdown-menu',
                attribute: {
                    role: 'menu'
                },
                childs: [{
                    nodeType: 'li',
                    style: 'cursor: pointer;',
                    id: 'DownloadSelected',
                    innerHTML: '<a><span class="glyphicon glyphicon-check"></span>下载所选</a>',
                    onclick: function () {
                        main.DownloadSelected();
                        document.getElementById("PluginUIStartUp").click();
                    }
                },
                {
                    nodeType: 'li',
                    style: 'display: none;cursor: pointer;',
                    id: 'DownloadAll',
                    innerHTML: '<a><span class="glyphicon glyphicon-save"></span>下载所有</a>',
                    onclick: function () {
                        main.DownloadAll();
                        document.getElementById("PluginUIStartUp").click();
                    }
                },
                {
                    nodeType: 'li',
                    style: 'cursor: pointer;',
                    id: 'ManualDownload',
                    innerHTML: '<a><span class="glyphicon glyphicon-edit"></span>手动下载</a>',
                    onclick: function () {
                        main.ManualParseDownloadAddress();
                        document.getElementById("PluginUIStartUp").click();
                    }
                },
                {
                    nodeType: 'li',
                    style: 'cursor: pointer;',
                    id: 'pluginSet',
                    innerHTML: '<a><span class="glyphicon glyphicon-cog"></span>设置</a>',
                    onclick: function () {
                        document.getElementById("PluginControlPanel").style.display = 'block';
                        document.getElementById("PluginUIStartUp").click();
                    }
                }]
            }],
            parent: document.getElementById("user-links")
        }],
        PluginControlPanel: [{
            nodeType: 'div',
            id: 'PluginControlPanel',
            className: 'controlPanel',
            childs: [{
                nodeType: 'div',
                className: 'controlPanel-content',
                childs: [{
                    nodeType: 'span',
                    className: 'controlPanelClose',
                    innerHTML: '&times;',
                    onclick: function () {
                        this.parentNode.parentNode.style.display = "none";
                        setting.setDownloadType(setting.DownloadType);
                        setting.setDownloadDir(setting.DownloadDir);
                        setting.setDownloadProxy(setting.DownloadProxy);
                        setting.setWebSocketAddress(setting.WebSocketAddress);
                        setting.setWebSocketToken(setting.WebSocketToken);
                        setting.setInitialize(true);
                        main.run();
                    }
                },
                {
                    nodeType: 'div',
                    id: 'controlPanelItem',
                    childs: [{
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin: 0px 10px 0px 0px;',
                                innerHTML: '下载方式:'
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadType',
                                type: 'radio',
                                value: type.Download.aria2,
                                onchange: ({ target }) => setting.setDownloadType(target.value)
                            },
                            {
                                nodeType: 'label',
                                style: 'margin: 0px 20px 0px 0px;',
                                innerHTML: 'Aria2'
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadType',
                                type: 'radio',
                                value: type.Download.default,
                                onchange: ({ target }) => setting.setDownloadType(target.value)
                            },
                            {
                                nodeType: 'label',
                                style: 'margin: 0px 20px 0px 0px;',
                                innerHTML: '浏览器默认'
                            },
                            {
                                nodeType: 'input',
                                name: 'DownloadType',
                                type: 'radio',
                                value: type.Download.others,
                                onchange: ({ target }) => setting.setDownloadType(target.value)
                            },
                            {
                                nodeType: 'label',
                                style: 'margin: 0px 20px 0px 0px;',
                                innerHTML: '其他下载器'
                            }
                        ]
                    }, {
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin-right: 5px;',
                                innerHTML: '下载到:',
                                for: "DownloadDir"
                            },
                            {
                                nodeType: 'input',
                                id: 'DownloadDir',
                                type: 'text',
                                value: setting.DownloadDir,
                                onchange: ({ target }) => {
                                    if (/^([\/] [\w-]+)*$/.test(target.value)) {
                                        target.style.replace(' background-color: red', '');
                                        setting.setDownloadDir(target.value);
                                    } else {
                                        target.style += ' background-color: red';
                                    }
                                },
                                style: 'width:100%;'
                            }
                        ]
                    }, {
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin-right: 5px;',
                                innerHTML: '代理服务器:',
                                for: "DownloadProxy"
                            },
                            {
                                nodeType: 'input',
                                id: 'DownloadProxy',
                                type: 'text',
                                value: setting.DownloadProxy,
                                onchange: ({ target }) => {
                                    if (/^http:\/\/([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/.test(target.value)) {
                                        target.style.replace(' background-color: red', '');
                                        setting.setDownloadProxy(target.value);
                                    } else {
                                        target.style += ' background-color: red';
                                    }
                                },
                                style: 'width:100%;'
                            }
                        ]
                    }, {
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin-right: 5px;',
                                innerHTML: 'Aria2 RPC WebSocket 地址:',
                                for: "WebSocketAddress"
                            },
                            {
                                nodeType: 'input',
                                id: 'WebSocketAddress',
                                type: 'text',
                                value: setting.WebSocketAddress,
                                onchange: ({ target }) => {
                                    if (/^ws:\/\/([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/.test(target.value)) {
                                        target.style.replace(' background-color: red', '');
                                        setting.setWebSocketAddress(target.value);
                                    } else {
                                        target.style += ' background-color: red';
                                    }
                                },
                                style: 'width:100%;'
                            }
                        ]
                    }, {
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin-right: 5px;',
                                innerHTML: 'Aria2 RPC Token(密钥):',
                                for: "WebSocketToken"
                            },
                            {
                                nodeType: 'input',
                                id: 'WebSocketToken',
                                type: 'password',
                                value: setting.WebSocketToken,
                                onchange: ({ target }) => setting.setWebSocketToken(target.value),
                                style: 'width:100%;'
                            }
                        ]
                    }, {
                        nodeType: 'div',
                        style: 'margin: 10px 0;',
                        childs: [
                            {
                                nodeType: 'label',
                                style: 'margin-right: 5px;',
                                innerHTML: '双击视频选中,再次双击取消选中.选中仅在本页面有效.<br />在作者用户页面可以点击下载全部,插件将会搜索该用户的所有视频进行下载.<br />插件下载视频前会检查视频简介,如果在简介中发现MEGA链接或百度网盘链接,将会打开视频页面,供您手动下载.<br />手动下载需要您提供视频ID!'
                            }
                        ]
                    }]
                }]
            }],
            parent: document.body
        }]
    };



    const main = {
        Aria2WebSocket: null,
        PluginControlPanel: null,
        start() {
            //创建并注入UI
            library.Dom.createElement(resources.PluginUI);
            main.PluginControlPanel = library.Dom.createElement(resources.PluginControlPanel);
            window.onclick = function (event) {
                if (!event.path.includes(document.getElementById("PluginUI"))) {
                    if (document.getElementById("PluginUI").classList.contains("open")) {
                        document.getElementById("PluginUI").classList.remove("open");
                    };
                };
            };
            //初始化
            for (let index = 0; index < document.querySelectorAll('input[name=DownloadType]').length; index++) {
                const element = document.querySelectorAll('input[name=DownloadType]')[index];
                if (Number(element.value) == this.DownloadType) {
                    element.setAttribute("checked", null);
                    break;
                };
            };
            if (!setting.Initialize) {
                //首次启动
                main.PluginControlPanel.style.display = 'block';
            } else {
                //正常启动
                main.run();
            };
        },
        run() {
            let runing = false;
            if (!runing) {
                var clickTimer = null;
                for (let index = 0; index < document.querySelectorAll('.node-video').length; index++) {
                    const element = document.querySelectorAll('.node-video')[index];
                    if (!element.classList.contains("node-full")) {
                        let selectButton =document.createElement("div");
                        selectButton.classList.add("selectButton");
                        selectButton.setAttribute("isselected", false);
                        library.Dom.moveElement(selectButton, element.querySelector('a'), true);
                        selectButton.ondblclick = function () {
                            if (clickTimer) {
                                window.clearTimeout(clickTimer);
                                clickTimer = null;
                            };
                            if (this.getAttribute("isselected") === "true") {
                                this.setAttribute("isselected", false);
                            } else {
                                this.setAttribute("isselected", true);
                            };
                        };
                        selectButton.onclick = function () {
                            if (clickTimer) {
                                window.clearTimeout(clickTimer);
                                clickTimer = null;
                            };
                            clickTimer = window.setTimeout(function () {
                                GM_openInTab(element.querySelector('a').href, { active: true, insert: true, setParent: true });
                            }, 250);
                        };
                    };
                };
                if (window.location.href.split("/")[3] == "users") {
                    document.getElementById("DownloadAll").style.display = "inline";
                };
                switch (setting.DownloadType) {
                    case type.Download.aria2:
                        console.log("正在链接Aria2RPC");
                        main.ConnectionWebSocket();
                        break;
                    case type.Download.default:
                        break;
                    case type.Download.others:
                        break;
                    default:
                        console.log("未知的下载模式!");
                        break;
                };
            };
        },
        ConnectionWebSocket() {
            try {
                this.Aria2WebSocket = new WebSocket(setting.WebSocketAddress + "jsonrpc");
                this.Aria2WebSocket.onopen = wsopen;
                this.Aria2WebSocket.onmessage = wsmessage;
                this.Aria2WebSocket.onclose = wsclose;
            } catch (err) {
                setting.initialize = false;
                this.Aria2WebSocket.close();
            }
            function wsopen() {
                console.log("链接成功!");
            };
            function wsmessage(evt) {
                console.log(evt);
            };

            function wsclose() {
                console.log("断开链接!");
            };
        },
        ManualParseDownloadAddress(ID) {
            if (ID == undefined) {
                ID = prompt("请输入需要下载的视频ID", "");
                if (ID.split("_")[1] != undefined) {
                    ID = ID.split("_")[1];
                };
            };
            debugger
            library.Net.get("https://ecchi.iwara.tv/videos/" + ID, null, window.location.href).then(
                function (responseData) {
                    if (responseData.status >= 200 && responseData.status < 300) {
                        responseData.text().then(function (response) {
                            let videoListRawData = library.Dom.parseDom(response);
                            if (videoListRawData.length == 0) {
                                console.log(ID+"没有找到可用的视频下载地址!");
                            } else {
                                library.Net.get(videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("username")[0].href, null, "https://ecchi.iwara.tv/videos/" + ID).then(
                                    function (responseData) {
                                        if (responseData.status >= 200 && responseData.status < 300) {
                                            responseData.text().then(function (response) {
                                                if (response.length == 0) {
                                                    console.log("获取作者名失败!");
                                                } else {
                                                    let Author = library.Dom.parseDom(response).getElementsByClassName("views-field-name")[0].getElementsByTagName("H2")[0].innerText;
                                                    let Name = videoListRawData.getElementsByTagName("H1")[0].innerText;
                                                    let comment;
                                                    try {
                                                        let commentArea = videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("field-type-text-with-summary field-label-hidden")[0].getElementsByClassName("field-item even");
                                                        for (let index = 0; index < commentArea.length; index++) {
                                                            const element = commentArea[index];
                                                            comment += element.innerText.toLowerCase();
                                                        };
                                                    } catch (error) {
                                                        comment = "null";
                                                    }
                                                    
                                                    if (comment.indexOf("/s/") != -1 || comment.indexOf("mega.nz/file/") != -1) {
                                                        window.open(element.getElementsByTagName("A")[0].href, '_blank');
                                                    } else {
                                                        library.Net.get("https://ecchi.iwara.tv/api/video/" + ID, null, "https://ecchi.iwara.tv/videos/" + ID).then(
                                                            function (responseData) {
                                                                if (responseData.status >= 200 && responseData.status < 300) {
                                                                    responseData.json().then(function (response) {
                                                                        let videoStreamInfo = response;
                                                                        if (videoStreamInfo.length == 0) {
                                                                            console.log(ID + "没有找到可用的视频下载地址!");
                                                                        } else {
                                                                            let Url = decodeURIComponent("https:" + videoStreamInfo[0]["uri"]);
                                                                            let FlieName = library.Net.getQueryVariable(Url, "file").split("/")[3];
                                                                            main.SendDownloadRequest(Name, Url, FlieName, Author, document.cookie);
                                                                        };
                                                                    });
                                                                };
                                                            }
                                                        );
                                                    };
                                                };
                                            });
                                        };
                                    }
                                );
                            };
                        });
                    };
                }
            );
        },
        DownloadSelected() {
            let select = document.createElement("div");
            for (let index = 0; index < document.getElementsByClassName("node-video").length; index++) {
                const element = document.getElementsByClassName("node-video")[index];
                if (!element.classList.contains("node-full")) {
                    if (element.getElementsByClassName("selectButton")[0].getAttribute("isselected") === "true") {
                        select.appendChild(element.cloneNode(true));
                    };
                };
            };
            main.ParseDownloadAddress(select);
        },
        DownloadAll() {
            if (document.getElementById("block-views-videos-block-2").getElementsByClassName("more-link").length == 0) {
                library.Net.get(window.location.href, null, window.location.href).then(
                    function (responseData) {
                        if (responseData.status >= 200 && responseData.status < 300) {
                            responseData.text().then(function (response) {
                                let videoListRawData = library.Dom.parseDom(response);
                                if (videoListRawData.length == 0) {
                                    console.log(responseData.url);
                                    debugger
                                } else {
                                    main.ParseDownloadAddress(videoListRawData.getElementById("block-views-videos-block-2"));
                                };
                            });
                        };
                    }
                );
            } else {
                let videoListUrl = window.location.href + "/videos";
                main.GetAllData(videoListUrl, null, window.location.href);
            };
        },
        GetAllData(videoListUrl, data, referrer) {
            library.Net.get(videoListUrl, data, referrer).then(
                function (responseData) {
                    if (responseData.status >= 200 && responseData.status < 300) {
                        responseData.text().then(function (response) {
                            let videoListRawData = library.Dom.parseDom(response);
                            if (videoListRawData.length == 0) {
                                console.log("没有找到可用的视频下载地址!");
                                GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                debugger
                            } else {
                                main.ParseDownloadAddress(videoListRawData);
                                if (videoListRawData.getElementsByClassName("pager-next").length != 0) {
                                    videoListUrl = videoListRawData.getElementsByClassName("pager-next")[0].children[0].href;
                                    main.GetAllData(videoListUrl, data, referrer);
                                } else {
                                    return;
                                };
                            };
                        });
                    };
                }
            );
        },
        ParseDownloadAddress(videosListDom) {
            let uploadedVideosList = videosListDom.getElementsByClassName("node-video");
            for (let index = 0; index < uploadedVideosList.length; index++) {
                const element = uploadedVideosList[index];
                let Author = element.getElementsByClassName("username")[0].innerText;
                let ID = element.querySelector('a').href.split("/")[4];
                let Name = element.getElementsByTagName("H3")[0].innerText;
                library.Net.get(element.getElementsByTagName("A")[0].href, null, window.location.href).then(
                    function (responseData) {
                        if (responseData.status >= 200 && responseData.status < 300) {
                            responseData.text().then(function (response) {
                                let videoListRawData = library.Dom.parseDom(response);
                                if (videoListRawData.length == 0) {
                                    console.log(ID + "没有找到可用的视频下载地址!");
                                } else {
                                    let comment;
                                    try {
                                        let commentArea = videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("field-type-text-with-summary field-label-hidden")[0].getElementsByClassName("field-item even");
                                        for (let index = 0; index < commentArea.length; index++) {
                                            const element = commentArea[index];
                                            comment += element.innerText.toLowerCase();
                                        };
                                    } catch (error) {
                                        comment = "null";
                                    }
                                    if (comment.indexOf("/s/") != -1 || comment.indexOf("mega.nz/file/") != -1) {
                                        window.open(element.getElementsByTagName("A")[0].href, '_blank');
                                    } else {
                                        library.Net.get("https://ecchi.iwara.tv/api/video/" + ID, null, element.getElementsByTagName("A")[0].href).then(
                                            function (responseData) {
                                                if (responseData.status >= 200 && responseData.status < 300) {
                                                    responseData.json().then(function (response) {
                                                        let videoStreamInfo = response;
                                                        if (videoStreamInfo.length == 0) {
                                                            console.log(ID + "没有找到可用的视频下载地址!");
                                                        } else {
                                                            let Url = decodeURIComponent("https:" + videoStreamInfo[0]["uri"]);
                                                            let FlieName = library.Net.getQueryVariable(Url, "file").split("/")[3];
                                                            main.SendDownloadRequest(Name, Url, FlieName, Author, document.cookie);
                                                        };
                                                    });
                                                };
                                            }
                                        );
                                    };
                                };
                            });
                        };
                    }
                );
            };
        },
        SendDownloadRequest(Name, Url, FlieName, Author, Cookie) {
            switch (setting.DownloadType) {
                case type.Download.aria2:
                    this.Aria2WebSocket.send(JSON.stringify({
                        "jsonrpc": "2.0",
                        "method": "aria2.addUri",
                        "id": setting.WebSocketID,
                        "params": [
                            "token:" + setting.WebSocketToken,
                            [
                                Url
                            ],
                            {
                                "referer": "https://ecchi.iwara.tv/",
                                "header": [
                                    "Cookie:" + Cookie
                                ],
                                "out": "!" + FlieName,
                                "dir": setting.DownloadDir + Author,
                                "all-proxy": setting.DownloadProxy,
                            }
                        ]
                    }));
                    break;
                case type.Download.default:
                    console.log("开始下载:" + FlieName);
                    (function (Url, FlieName) {
                        let Name = FlieName;
                        GM_download({
                            name: FlieName,
                            url: Url,
                            saveAs: false,
                            onload: function () {
                                console.log(Name + " 下载完成!");
                            },
                            onerror: function (error) {
                                console.log(Name + " 下载失败!");
                                console.log(error);
                            }
                        });
                    })(Url, FlieName);
                    break;
                case type.Download.others:
                    GM_openInTab(Url, { active: true, insert: true, setParent: true });
                    break;
                default:
                    console.log("未知的下载模式!");
                    break;
            }
        }
    }

    main.start();
})();
