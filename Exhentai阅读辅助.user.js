// ==UserScript==
// @name         Exhentai阅读辅助
// @namespace    https://github.com/dawn-lc/user.js/
// @version      1.1.0
// @description  可以在浏览Exhentai中需要双手离开键盘的时候,帮你自动翻页.ctrl+上/下调整翻页间隔.左/右=上一页/下一页.回车开关自动翻页.
// @author       凌晨
// @icon         http://exhentai.org/favicon.ico
// @match        https://exhentai.org/s/*/*
// @match        https://e-hentai.org/s/*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {



    /*初始化*/
    var head = document.head || document.getElementsByTagName('head')[0];
    var body = document.body || document.getElementsByTagName('body')[0];
    var imgLoadComplete = false;
    var nextTimeOut = 5;
    var slideShowMode = false;
    var img = undefined;
    var slideShowLoop;

    var controlPanelCss = document.createElement("style");
    controlPanelCss.innerHTML = `
    #controlPanel {
        width: 120px;
        overflow: hidden;
        position: fixed;
        top:30px;
        right:-120px;
        z-index: 500;
        background-color: gray;
    }
    .controlPanelItem {
        margin: 5px;
    }

    .info_longAnimation{
        animation:info 5s ease-in-out 0s 1 normal;
        -webkit-animation:info 5s ease-in-out 0s 1 normal;
    }
    .info_shortAnimation{
        animation:info 2s ease-in-out 0s 1 normal;
        -webkit-animation:info 2s ease-in-out 0s 1 normal;
    }

    @keyframes info {
        0%   {right:-120px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-120px;}
    }
    /* Firefox */
    @-moz-keyframes info {
        0%   {right:-120px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-120px;}
    }
    /* Safari 和 Chrome */
    @-webkit-keyframes info {
        0%   {right:-120px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-120px;}
    }
    /* Opera */
    @-o-keyframes info {
        0%   {right:-120px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-120px;}
    }
    `;
    var controlPanelCode = document.createElement("div");
    controlPanelCode.id = "controlPanel";
    controlPanelCode.innerHTML = `<div id="controlPanelItem" class="controlPanelItem"></div>`;
    head.appendChild(controlPanelCss);
    body.insertBefore(controlPanelCode, body.childNodes[0]);

    var controlPanel = document.getElementById("controlPanel");
    var controlPanelItem = document.getElementById("controlPanelItem");


    function msg(msg, type) {
        controlPanel.classList = "";
        controlPanel.offsetWidth = controlPanel.offsetWidth;
        controlPanelItem.innerText = msg;
        controlPanel.classList.add('info_' + type);
    }



    if (GM_getValue("nextTimeOut",undefined)!=undefined) {
        nextTimeOut = Number(GM_getValue("nextTimeOut"));
        GM_setValue("nextTimeOut",nextTimeOut);
    } else {
        GM_setValue("nextTimeOut",nextTimeOut);
    }

    if (GM_getValue("slideShowMode",undefined)!=undefined) {
        slideShowMode = GM_getValue("slideShowMode");
    } else {
        GM_setValue("slideShowMode",slideShowMode);
    }

    if (document.getElementById("i3")) {
        addListener();
    }

    function addListener() {
        document.getElementById("i3").addEventListener('DOMNodeRemoved', function imgChange() {
            img = undefined;
            msg("正在等待图片源...","longAnimation");
        });
        document.getElementById("i3").addEventListener('DOMNodeInserted', function imgLoad() {
            img = document.getElementById("i3").childNodes[0].childNodes[0];
            document.getElementById("i3").childNodes[0].childNodes[0].addEventListener('load', waitImgLoad());
            msg("正在连接图片源...","longAnimation");
        });
    }

    function waitImgLoad() {
        msg("加载图片中...","longAnimation");
        img.onload = function () {
            imgLoadComplete = true;
            msg("图片加载完成!","shortAnimation");
            window.scrollTo({
                top: img.offsetTop,
                behavior: "smooth"
            });
            checkSlideShow();
        }
        img.onerror = function () {
            imgLoadComplete = false;
            msg("图片加载失败!","shortAnimation");
            addListener();
            checkSlideShow();
        }
    }

    function switchSlideShowMode() {
        if (slideShowMode) {
            slideShowMode = false;
            msg("关闭自动翻页模式!","shortAnimation");
            GM_setValue("slideShowMode",slideShowMode);
            checkSlideShow();
        } else {
            slideShowMode = true;
            msg("开启自动翻页模式!","shortAnimation");
            GM_setValue("slideShowMode",slideShowMode);
            checkSlideShow();

        }
    }

    function checkSlideShow() {
        if (imgLoadComplete) {
            if (slideShowMode) {
                SlideShow();
            } else {
                clearTimeout(slideShowLoop);
            }
        } else {
            if (slideShowMode) {
                clearTimeout(slideShowLoop);
                load_image(Number(document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML), window.location.href.split("/")[4]);
            } else {
                clearTimeout(slideShowLoop);
            }
        }
    }

    function SlideShow() {
        msg(nextTimeOut + "秒后翻页","shortAnimation");
        slideShowLoop = setTimeout(function () {
            next();
        }, nextTimeOut * 1000);
    }

    function nextTimeOutAdd() {
        nextTimeOut++;
        GM_setValue("nextTimeOut",nextTimeOut);
        msg("间隔为:" + nextTimeOut + "秒(下一页生效)","shortAnimation");
    }
    function nextTimeOutSub() {
        nextTimeOut--;
        GM_setValue("nextTimeOut",nextTimeOut);
        msg("间隔为:" + nextTimeOut + "秒(下一页生效)","shortAnimation");
    }
    function next() {
        if (document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML) {
            msg("这是最后一页!","shortAnimation");
            slideShowMode = false;
            GM_setValue("slideShowMode",slideShowMode);
        } else {
            document.getElementById('next').onclick();
        }
    }
    function previous() {
        if (document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML == "1") {
            msg("这是第一页!","shortAnimation");
            slideShowMode = false;
            GM_setValue("slideShowMode",slideShowMode);
        } else {
            document.getElementById('prev').onclick();
        }
    }



    document.onkeydown = function (event) {
        var e = event || window.e;
        var keyCode = e.keyCode || e.which || e.charCode;
        var altKey = e.altKey;
        var shiftKey = e.shiftKey;
        var ctrlKey = e.ctrlKey;
        var metaKey = e.metaKey;
        switch (keyCode) {
            case 108:
            case 13:
                //回车
                switchSlideShowMode();
                break
            case 38:
                //上
                //nextTimeOutAdd();
                break
            case 40:
                //下
                //nextTimeOutSub();
                break
            case 37:
                //左
                previous();
                break
            case 39:
                //右
                next();
                break
        }
        if (ctrlKey && keyCode == 38) {
            nextTimeOutAdd();
        }
        if (ctrlKey && keyCode == 40) {
            nextTimeOutSub();
        }
    }
})();
