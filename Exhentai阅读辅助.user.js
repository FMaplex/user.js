// ==UserScript==
// @name         Exhentai阅读辅助
// @namespace    https://github.com/dawn-lc/user.js/
// @version      1.3.4
// @description  可以在浏览Exhentai时需要双手离开键盘的时候, 帮你自动翻页。ctrl+上/下调整翻页间隔、左/右=上一页/下一页、回车开关自动翻页。[不支持多页查看器]
// @author       凌晨
// @icon         http://exhentai.org/favicon.ico
// @match        *://exhentai.org/s/*/*
// @match        *://e-hentai.org/s/*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {

    /*初始化*/
    var head = document.head || document.getElementsByTagName('head')[0];
    var body = document.body || document.getElementsByTagName('body')[0];
    //图片是否加载完成标识
    var imgLoadComplete = false;
    //初始化自动翻页延迟
    var nextTimeOut = 5;
    //初始化幻灯片放映模式
    var slideShowMode = false;
    //初始化图片对象
    var img = undefined;
    //初始化幻灯片放映循环
    var slideShowLoop;

    //读取自动翻页延迟配置
    if (GM_getValue("nextTimeOut", undefined) != undefined) {
        nextTimeOut = Number(GM_getValue("nextTimeOut"));
        GM_setValue("nextTimeOut", nextTimeOut);
    } else {
        GM_setValue("nextTimeOut", nextTimeOut);
    }
    //读取幻灯片放映模式配置
    if (GM_getValue("slideShowMode", undefined) != undefined) {
        slideShowMode = GM_getValue("slideShowMode");
    } else {
        GM_setValue("slideShowMode", slideShowMode);
    }

    //样式本体
    var infoPanelCss = document.createElement("style");
    infoPanelCss.innerHTML = `
    #infoPanel {
        width: 128px;
        overflow: hidden;
        position: fixed;
        top: 28px;
        right: -128px;
        z-index: 999;
        background-color: gray;
    }
    .infoPanelItem {
        margin: 5px 3px 5px 3px;
    }
    .info_longAnimation{
        animation:info 5s ease-in-out forwards 0s 1 normal;
        -webkit-animation:info 5s ease-in-out forwards 0s 1 normal;
    }
    .info_shortAnimation{
        animation:info 2s ease-in-out forwards 0s 1 normal;
        -webkit-animation:info 2s ease-in-out forwards 0s 1 normal;
    }

    .info_longAnimationIn{
        animation:infoIn 0.5s ease-in forwards 0s 1 normal;
        -webkit-animation:infoIn 0.5s ease-in forwards 0s 1 normal;
    }
    .info_shortAnimationIn{
        animation:infoIn 0.2s ease-in 0s 1 normal;
        -webkit-animation:infoIn 0.2s ease-in forwards 0s 1 normal;
    }

    .info_longAnimationOut{
        animation:infoOut 0.25s ease-out forwards 0s 1 normal;
        -webkit-animation:infoOut 0.25s ease-out forwards 0s 1 normal;
    }
    .info_shortAnimationOut{
        animation:infoOut 0.1s ease-out forwards 0s 1 normal;
        -webkit-animation:infoOut 0.1s ease-out forwards 0s 1 normal;
    }

    .info_pauseAnimation{
        animation-play-state:paused;
        -webkit-animation-play-state:paused;
    }
    .info_runAnimation{
        animation-play-state:running;
        -webkit-animation-play-state:running;
    }

    @keyframes info {
        0%   {right:-128px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-128px;}
    }
    @-moz-keyframes info {
        0%   {right:-128px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-128px;}
    }
    @-webkit-keyframes info {
        0%   {right:-128px;}
        10%  {right:0px;}
        95%  {right:0px;}
        100% {right:-128px;}
    }
    @-o-keyframes info {
        0%   {right:-128px;}
        100% {right:0px;}
    }


    @keyframes infoIn {
        0%   {right:-128px;}
        100% {right:0px;}
    }
    @-moz-keyframes infoIn {
        0%   {right:-128px;}
        100% {right:0px;}
    }
    @-webkit-keyframes infoIn {
        0%   {right:-128px;}
        100% {right:0px;}
    }
    @-o-keyframes infoIn {
        0%   {right:-128px;}
        100% {right:0px;}
    }


    @keyframes infoOut {
        0%   {right:0px;}
        100% {right:-128px;}
    }
    @-moz-keyframes infoOut {
        0%   {right:0px;}
        100% {right:-128px;}
    }
    @-webkit-keyframes infoOut {
        0%   {right:0px;}
        100% {right:-128px;}
    }
    @-o-keyframes infoOut {
        0%   {right:0px;}
        100% {right:-128px;}
    }
    `;
    head.appendChild(infoPanelCss);

    //弹窗本体
    var infoPanelCode = document.createElement("div");
    infoPanelCode.id = "infoPanel";
    infoPanelCode.innerHTML = `<div id="infoPanelItem" class="infoPanelItem"></div>`;
    body.insertBefore(infoPanelCode, body.childNodes[0]);

    //绑定
    var infoPanel = document.getElementById("infoPanel");
    var infoPanelItem = document.getElementById("infoPanelItem");

    //弹窗函数
    function msg(type, msgText = "") {
        if (msgText != "") {
            infoPanelItem.innerText = msgText;
        }
        switch (type) {
            case "pauseAnimation":
                infoPanel.classList = infoPanel.classList.replace(/info_runAnimation/g, "").trim();
                infoPanel.offsetWidth = infoPanel.offsetWidth;
                infoPanel.classList.add('info_' + type);
                break;
            case "runAnimation":
                infoPanel.classList = infoPanel.classList.replace(/info_pauseAnimation/g, "").trim();
                infoPanel.offsetWidth = infoPanel.offsetWidth;
                infoPanel.classList.add('info_' + type);
                break;
            default:
                infoPanel.classList = "";
                infoPanel.offsetWidth = infoPanel.offsetWidth;
                infoPanel.classList.add('info_' + type);
                break;
        }
    }

    //检查图片是否加载若已加载添加监听
    if (document.getElementById("i3")) {
        addListener();
    }

    //监听
    function addListener() {
        document.getElementById("i3").addEventListener('DOMNodeInserted', function imgLoad() {
            msg("longAnimationOut");
            msg("longAnimationIn", "找到图片源!尝试连接中...");
            img = document.getElementById("i3").childNodes[0].childNodes[0];
            document.getElementById("i3").childNodes[0].childNodes[0].addEventListener('load', waitImgLoad());
        });
        document.getElementById("i3").addEventListener('DOMNodeRemoved', function imgChange() {
            img = undefined;
            msg("longAnimationIn", "正在查找图片源...");
        });
    }



    //等待图片加载
    function waitImgLoad() {
        msg("longAnimationOut");
        msg("longAnimationIn", "正在加载图片...");
        img.onload = function () {
            imgLoadComplete = true;
            msg("longAnimationOut");
            msg("shortAnimation", "图片加载完成!");
            window.scrollTo({
                top: img.offsetTop,
                behavior: "smooth"
            });
            checkSlideShow();
        }
        img.onabort = function () {
            imgLoadComplete = false;
            msg("longAnimationOut");
            msg("shortAnimation", "图片加载失败!");
            addListener();
            checkSlideShow();
        }
        img.onerror = function () {
            imgLoadComplete = false;
            msg("longAnimationOut");
            msg("shortAnimation", "图片加载失败!");
            addListener();
            checkSlideShow();
        }
    }

    //切换幻灯片放映模式
    function switchSlideShowMode() {
        if (slideShowMode) {
            slideShowMode = false;
            msg("shortAnimation", "关闭自动翻页模式!");
            GM_setValue("slideShowMode", slideShowMode);
            checkSlideShow();
        } else {
            slideShowMode = true;
            msg("shortAnimation", "开启自动翻页模式!");
            GM_setValue("slideShowMode", slideShowMode);
            checkSlideShow();
        }
    }

    //检查幻灯片放映模式
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

    //开始幻灯片放映模式
    function SlideShow() {
        if (document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML) {
            msg("shortAnimation", "这是最后一页!");
            slideShowMode = false;
            clearTimeout(slideShowLoop);
            GM_setValue("slideShowMode", slideShowMode);
        } else {
            msg("shortAnimation", nextTimeOut + "秒后翻页");
            slideShowLoop = setTimeout(function () {
                next();
            }, nextTimeOut * 1000);
        }
    }

    //增加自动翻页延迟
    function nextTimeOutAdd() {
        nextTimeOut++;
        GM_setValue("nextTimeOut", nextTimeOut);
        msg("shortAnimation", "间隔为:" + nextTimeOut + "秒(下一页生效)");
    }

    //减少自动翻页延迟
    function nextTimeOutSub() {
        nextTimeOut--;
        GM_setValue("nextTimeOut", nextTimeOut);
        msg("shortAnimation", "间隔为:" + nextTimeOut + "秒(下一页生效)");
    }

    //翻页
    function switchPage(PreviousOrNext) {
        switch (PreviousOrNext) {
            case "nextPage":
                if (document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML) {
                    msg("shortAnimation", "这是最后一页!");
                    slideShowMode = false;
                    clearTimeout(slideShowLoop);
                    GM_setValue("slideShowMode", slideShowMode);
                    break;
                } else {
                    next();
                    break;
                }
            case "previousPage":
                if (document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML == "1") {
                    msg("shortAnimation", "这是第一页!");
                    slideShowMode = false;
                    clearTimeout(slideShowLoop);
                    GM_setValue("slideShowMode", slideShowMode);
                    break;
                } else {
                    previous();
                    break;
                }
            default:
                msg("错误的需求!", "shortAnimation");
                slideShowMode = false;
                clearTimeout(slideShowLoop);
                GM_setValue("slideShowMode", slideShowMode);
                break;
        }
    }

    //下一页
    function next() {
        clearTimeout(slideShowLoop);
        document.getElementById('next').onclick();
    }

    //上一页
    function previous() {
        clearTimeout(slideShowLoop);
        document.getElementById('prev').onclick();
    }

    //监听键盘快捷键
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
                switchPage("previousPage");
                break
            case 39:
                //右
                switchPage("nextPage");
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
