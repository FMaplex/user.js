// ==UserScript==
// @name         iwara下载助手
// @namespace    https://github.com/dawn-lc/user.js
// @version      1.0.9
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


    function fromData(Data) {
        let str = "";
        for (var key in Data) {
            str += key + '=' + Data[key] + '&';
        };
        return str.substr(0, str.length - 1);
    };
    function getQueryVariable(query, variable) {
        let vars = query.split("&");
        for (let i = 0; i < vars.length; i++) {
            let pair = vars[i].split("=");
            if (pair[0] == variable) { return pair[1]; };
        };
        return (false);
    };
    function parseDom(arg) {
        return new DOMParser().parseFromString(arg, 'text/html');
    };
    function getData(url, data, referrer) {
        return fetch(url + "?" + fromData(data), {
            headers: {
                "accept": "application/json, text/plain, */*",
                "content-type": "application/x-www-form-urlencoded",
            },
            referrer: referrer,
            credentials: 'include',
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });
    };
    function guid() {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };
        return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
    };



    const element = {
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
                }
                else if (i == 'attribute') {
                    for (const key in detailedList.attribute) {
                        item.setAttribute(key, detailedList.attribute[key]);
                    };
                }
                else if (i == 'parent') {
                    detailedList.parent.appendChild(item);
                }
                else if (detailedList[i] instanceof Object && item[i]) {
                    Object.entries(detailedList[i]).forEach(([k, v]) => {
                        item[i][k] = v;
                    });
                }
                else {
                    item[i] = detailedList[i];
                }
            }
            return item;
        }
    };



    const DownloadTypes = {
        //aria2
        aria2: 0,
        //默认
        default: 1,
        //其他
        others: 2
    }
    const setting = {
        Initialize: GM_getValue("Initialize", false),
        DownloadType: GM_getValue("DownloadType", DownloadTypes.default),
        DownloadDir: GM_getValue("DownloadDir", ''),
        DownloadProxy: GM_getValue("DownloadProxy", ''),
        WebSocketAddress: GM_getValue("WebSocketAddress", 'ws://127.0.0.1:6800/'),
        WebSocketToken: GM_getValue("WebSocketToken", ''),
        WebSocketID: GM_getValue("WebSocketID", guid()),
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
        },
        setting() {
            if (!document.getElementById("PluginControlPanel")) element.createElement(main.PluginControlPanel);
            document.getElementById("PluginControlPanel").style.display = 'block';
            for (let index = 0; index < document.getElementsByTagName("INPUT").length; index++) {
                const element = document.getElementsByTagName("INPUT")[index];
                if (element.name == "DownloadType" && Number(element.value) == this.DownloadType) {
                    element.setAttribute("checked", null);
                    break;
                }
            }
        }
    };




    const main = {
        Aria2WebSocket: undefined,
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
            getData("https://ecchi.iwara.tv/videos/" + ID, null, window.location.href).then(
                function (responseData) {
                    if (responseData.status >= 200 && responseData.status < 300) {
                        responseData.text().then(function (response) {
                            let videoListRawData = parseDom(response);
                            if (videoListRawData.length == 0) {
                                console.log("没有找到可用的视频下载地址!");
                                GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                debugger
                            } else {
                                let Author = videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("username")[0].innerText;
                                let Name = videoListRawData.getElementsByTagName("H1")[0].innerText;
                                let commentArea = videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("field-type-text-with-summary field-label-hidden")[0].getElementsByClassName("field-item even");
                                let comment;
                                for (let index = 0; index < commentArea.length; index++) {
                                    const element = commentArea[index];
                                    comment += element.innerText.toUpperCase();
                                };
                                if (comment.indexOf("/S/") != -1 || comment.indexOf("MEGA") != -1) {
                                    window.open(element.getElementsByTagName("A")[0].href, '_blank');
                                } else {
                                    getData("https://ecchi.iwara.tv/api/video/" + ID, null, "https://ecchi.iwara.tv/videos/" + ID).then(
                                        function (responseData) {
                                            if (responseData.status >= 200 && responseData.status < 300) {
                                                responseData.json().then(function (response) {
                                                    let videoStreamInfo = response;
                                                    if (videoStreamInfo.length == 0) {
                                                        console.log("没有找到可用的视频下载地址!");
                                                        GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                                        debugger
                                                    } else {
                                                        let Url = decodeURIComponent("https:" + videoStreamInfo[0]["uri"]);
                                                        let FlieName = getQueryVariable(Url, "file").split("/")[3];
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
                getData(window.location.href, null, window.location.href).then(
                    function (responseData) {
                        if (responseData.status >= 200 && responseData.status < 300) {
                            responseData.text().then(function (response) {
                                let videoListRawData = parseDom(response);
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
            getData(videoListUrl, data, referrer).then(
                function (responseData) {
                    if (responseData.status >= 200 && responseData.status < 300) {
                        responseData.text().then(function (response) {
                            let videoListRawData = parseDom(response);
                            if (videoListRawData.length == 0) {
                                console.log("没有找到可用的视频下载地址!");
                                GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                debugger
                            } else {
                                ParseDownloadAddress(videoListRawData);
                                if (videoListRawData.getElementsByClassName("pager-next").length != 0) {
                                    videoListUrl = videoListRawData.getElementsByClassName("pager-next")[0].children[0].href;
                                    this.GetAllData(videoListUrl, data, referrer);
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
                let ID = element.getElementsByTagName("A")[0].href.split("/")[4];
                let Name = element.getElementsByTagName("H3")[0].innerText;
                getData(element.getElementsByTagName("A")[0].href, null, window.location.href).then(
                    function (responseData) {
                        if (responseData.status >= 200 && responseData.status < 300) {
                            responseData.text().then(function (response) {
                                let videoListRawData = parseDom(response);
                                if (videoListRawData.length == 0) {
                                    console.log("没有找到可用的视频下载地址!");
                                    GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                    debugger
                                } else {
                                    let commentArea = videoListRawData.getElementsByClassName("node-info")[0].getElementsByClassName("field-type-text-with-summary field-label-hidden")[0].getElementsByClassName("field-item even");
                                    let comment;
                                    for (let index = 0; index < commentArea.length; index++) {
                                        const element = commentArea[index];
                                        comment += element.innerText.toUpperCase();
                                    };
                                    if (comment.indexOf("/S/") != -1 || comment.indexOf("MEGA") != -1) {
                                        window.open(element.getElementsByTagName("A")[0].href, '_blank');
                                    } else {
                                        getData("https://ecchi.iwara.tv/api/video/" + ID, null, element.getElementsByTagName("A")[0].href).then(
                                            function (responseData) {
                                                if (responseData.status >= 200 && responseData.status < 300) {
                                                    responseData.json().then(function (response) {
                                                        let videoStreamInfo = response;
                                                        if (videoStreamInfo.length == 0) {
                                                            console.log("没有找到可用的视频下载地址!");
                                                            GM_openInTab(responseData.url, { active: true, insert: true, setParent: true });
                                                            debugger
                                                        } else {
                                                            let Url = decodeURIComponent("https:" + videoStreamInfo[0]["uri"]);
                                                            let FlieName = getQueryVariable(Url, "file").split("/")[3];
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
                case DownloadTypes.aria2:
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
                                "out": FlieName,
                                "dir": setting.DownloadDir + Author,
                                "all-proxy": setting.DownloadProxy,
                            }
                        ]
                    }));
                    break;
                case DownloadTypes.default:
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
                case DownloadTypes.others:
                    GM_openInTab(Url, { active: true, insert: true, setParent: true });
                    break;
                default:
                    console.log("未知的下载模式!");
                    break;
            }
        },
        Selected() {
            var clickTimer = null;
            for (let index = 0; index < document.getElementsByClassName("node-video").length; index++) {
                const element = document.getElementsByClassName("node-video")[index];
                if (!element.classList.contains("node-full")) {
                    let selectButton = element.getElementsByClassName("field-items")[0];
                    for (let index = 0; index < selectButton.getElementsByTagName("A").length; index++) {
                        const a = selectButton.getElementsByTagName("A")[index];
                        a.parentNode.appendChild(a.childNodes[0])
                        a.style.display = "none";
                    };
                    selectButton.classList.add("selectButton");
                    selectButton.setAttribute("isselected", false);
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
                            element.getElementsByTagName("A")[1].click();
                        }, 300);
                    };
                };
            };
            if (window.location.href.split("/")[3] == "users") {
                document.getElementById("DownloadAll").style.display = "inline";
            };
        },
        PluginUI: [{
            nodeType: 'style',
            innerHTML: `.selectButton{
                text-align:right;
            }
            .selectButton[isselected=false]:before
            {
                position:absolute;
                content: "";
            }
            .selectButton[isselected=true]:before
            {
                position:absolute;
                content: "√";
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
            }
            /* 弹窗内容 */
            .controlPanel-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
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
                        setting.setting();
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
                        switch (setting.DownloadType) {
                            case DownloadTypes.aria2:
                                console.log("正在链接Aria2RPC");
                                main.ConnectionWebSocket();
                                break;
                            case DownloadTypes.default:
                                break;
                            case DownloadTypes.others:
                                break;
                            default:
                                console.log("未知的下载模式!");
                                break;
                        }
                        setting.setDownloadDir(setting.DownloadDir);
                        setting.setDownloadProxy(setting.DownloadProxy);
                        setting.setWebSocketAddress(setting.WebSocketAddress);
                        setting.setWebSocketToken(setting.WebSocketToken);
                        document.getElementById("DownloadSelected").style.display = "inline";
                        document.getElementById("ManualDownload").style.display = "inline";
                        setting.setInitialize(true);
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
                                value: DownloadTypes.aria2,
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
                                value: DownloadTypes.default,
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
                                value: DownloadTypes.others,
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
                                onchange: ({ target }) => setting.setDownloadDir(target.value),
                                style: 'width:100%'
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
                                onchange: ({ target }) => setting.setDownloadProxy(target.value),
                                style: 'width:100%'
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
                                onchange: ({ target }) => setting.setWebSocketAddress(target.value),
                                style: 'width:100%'
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
                                style: 'width:100%'
                            }
                        ]
                    }]
                }]
            }],
            parent: document.body
        }]
    }

    element.createElement(main.PluginUI);

    window.onclick = function (event) {
        if (!event.path.includes(document.getElementById("PluginUI"))) {
            if (document.getElementById("PluginUI").classList.contains("open")) {
                document.getElementById("PluginUI").classList.remove("open");
            }
        }
    };

    if (setting.Initialize) {
        switch (setting.DownloadType) {
            case DownloadTypes.aria2:
                console.log("正在链接Aria2RPC");
                main.ConnectionWebSocket();
                break;
            case DownloadTypes.default:
                break;
            case DownloadTypes.others:
                break;
            default:
                console.log("未知的下载模式!");
                break;
        }
        main.Selected();
    } else {
        document.getElementById("DownloadSelected").style.display = "none";
        document.getElementById("ManualDownload").style.display = "none";
        setting.setting();
        main.Selected();
    }
})();
