// ==UserScript==
// @name         Exhentai阅读辅助
// @namespace    https://github.com/dawn-lc/user.js/
// @version      1.0
// @description  可以在浏览Exhentai中需要双手离开键盘的时候,帮你自动翻页
// @author       凌晨
// @icon         http://exhentai.org/favicon.ico
// @match        https://exhentai.org/s/*/*
// @match        https://e-hentai.org/s/*/*
// @grant        none
// ==/UserScript==

(function() {

    /*Cookie*/
    function setCookie(cname, cvalue, ctime) {
        if (ctime>=0 & ctime == undefined){
            expires = "expires=" + "-1";
        }else{
            var d = new Date();
            d.setTime(d.getTime()+ctime);
            expires = "expires=" + d.toUTCString();
        }
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
    function checkCookie(cname) {
        var Cookie = getCookie(cname);
        if (Cookie != "") {
            return true;
        } else {
            return false;
        }
    }
    /*Cookie end*/

    var msgAnimationing = false;
    var imgLoadComplete = false;
    var head = document.head || document.getElementsByTagName('head')[0];
    var body = document.body || document.getElementsByTagName('body')[0];
    var controlPanelCss =document.createElement("style");
    controlPanelCss.innerHTML=`
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
    @keyframes info {
        0%   {right:-120px;}
        20%  {right:0px;}
        80%  {right:0px;}
        100% {right:-120px;}
    }
    /* Firefox */
    @-moz-keyframes info {
        0%   {right:-120px;}
        20%  {right:0px;}
        80%  {right:0px;}
        100% {right:-120px;}
    }
    /* Safari 和 Chrome */
    @-webkit-keyframes info {
        0%   {right:-120px;}
        20%  {right:0px;}
        80%  {right:0px;}
        100% {right:-120px;}
    }
    /* Opera */
    @-o-keyframes info {
        0%   {right:-120px;}
        20%  {right:0px;}
        80%  {right:0px;}
        100% {right:-120px;}
    }
    `;
    var controlPanelCode =document.createElement("div");
    controlPanelCode.id="controlPanel";
    controlPanelCode.innerHTML=`
    <div id="controlPanelItem" class="controlPanelItem">
    </div>
    `;
    head.appendChild(controlPanelCss);
    body.insertBefore(controlPanelCode,body.childNodes[0]);
    //body.appendChild(controlPanelCode);

    var controlPanel=document.getElementById("controlPanel");
    var controlPanelItem=document.getElementById("controlPanelItem");

    function controlPanelInfo(info,Time){
        if (Time==undefined){
            Time="2s";
        }
        controlPanelItem.innerText = info;
        Msg(Time,true);
        return;
    }
    //弹出提示
    function Msg(Time,Enforce) {
        if (Enforce) {
            controlPanel.style.WebkitAnimation = ""; 
            controlPanel.style.animation = "";
            controlPanel.style['right'] = '-120px';
            msgAnimationing = false;
            /* 开始动画 */
            controlPanel.style.WebkitAnimation = "info " + Time + " ease-in-out 1"; 
            controlPanel.style.animation = "info " + Time + " ease-in-out 1";
            msgAnimationing = true;
            controlPanel.addEventListener("webkitAnimationStart", msgAnimationStart);
            controlPanel.addEventListener("webkitAnimationIteration", msgAnimationIteration);
            controlPanel.addEventListener("webkitAnimationEnd", msgAnimationEnd);
            controlPanel.addEventListener("animationstart", msgAnimationStart);
            controlPanel.addEventListener("animationiteration", msgAnimationIteration);
            controlPanel.addEventListener("animationend", msgAnimationEnd);
            return;
        }else{
            if (msgAnimationing){
                Msg(Time,true);
                return;
            }
            controlPanel.style.WebkitAnimation = "info " + Time + " ease-in-out 1"; 
            controlPanel.style.animation = "info " + Time + " ease-in-out 1";
            msgAnimationing = true;
            controlPanel.addEventListener("webkitAnimationStart", msgAnimationStart);
            controlPanel.addEventListener("webkitAnimationIteration", msgAnimationIteration);
            controlPanel.addEventListener("webkitAnimationEnd", msgAnimationEnd);
            controlPanel.addEventListener("animationstart", msgAnimationStart);
            controlPanel.addEventListener("animationiteration", msgAnimationIteration);
            controlPanel.addEventListener("animationend", msgAnimationEnd);
            return;
        };
    };

    /*动画开始*/
    function msgAnimationStart() {
        msgAnimationing = true;
    };

    /*动画重新播放*/
    function msgAnimationIteration() {
        msgAnimationing = true;
    };

    /*动画结束*/
    function msgAnimationEnd() {
        controlPanel.style.WebkitAnimation = ""; // Chrome, Safari 和 Opera 代码
        controlPanel.style.animation = "";
        controlPanel.style['right'] = '-120px';
        msgAnimationing = false;
    };
    
    var nextTimeOut = 5;
    var slideShowMode = false;
    var img = undefined;
    var slideShowLoop;

    if (checkCookie("nextTimeOut")){
        nextTimeOut = Number(getCookie("nextTimeOut"));
        var t= new Date();
        setCookie("nextTimeOut",nextTimeOut,365 * 24 * 60 * 60 * 1000);
    }else{
        var t= new Date();
        setCookie("nextTimeOut",nextTimeOut,365 * 24 * 60 * 60 * 1000);
    }
    if (checkCookie("slideShowMode")){
        if (getCookie("slideShowMode").toLowerCase=="true"){
            slideShowMode = true;
        }else{
            slideShowMode = false;
        }
    }else{
        setCookie("slideShowMode",slideShowMode,-1);
    }

    if (document.getElementById("i3")){
        addListener();
    }

    function addListener(){
        document.getElementById("i3").addEventListener('DOMNodeRemoved',function imgChange(){
            //document.getElementById("i3").childNodes[0].childNodes[0].removeEventListener('load', waitImgLoad());
            img=undefined;
            controlPanelInfo("正在等待图片源...");
        });
        document.getElementById("i3").addEventListener('DOMNodeInserted',function imgLoad(){
            img = document.getElementById("i3").childNodes[0].childNodes[0];
            document.getElementById("i3").childNodes[0].childNodes[0].addEventListener('load', waitImgLoad());
            controlPanelInfo("正在连接图片源...");
        });
    }
    function waitImgLoad(){
        controlPanelInfo("加载图片中...");
        img.onload =function() {
            imgLoadComplete = true;
            controlPanelInfo("图片加载完成!");
            window.scrollTo({ 
                top: img.offsetTop, 
                behavior: "smooth" 
            });
            slideShow();
        }
    }

    document.onkeydown = function(event) {
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
        if(ctrlKey && keyCode == 38) {
            nextTimeOutAdd();
        }
        if(ctrlKey && keyCode == 40) {
            nextTimeOutSub();
        }
    }

    /*
    body.addEventListener('DOMNodeInserted',function(){
        if (document.getElementById("i3")){
            addListener();
        }
    });
    
    var observer_info = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(element =>{
                    if (element.id == "i3") {
                        addListener();
                        observer_info.disconnect();
                    };
                });
            };
        });
    });
    observer_info.observe(document.body, {
        childList: true
    });
    */




    function switchSlideShowMode() {
        if (slideShowMode){
            slideShowMode = false;
            controlPanelInfo("关闭幻灯片模式!");
            setCookie("slideShowMode",false,-1);
            slideShow();
        }else{
            slideShowMode = true; 
            controlPanelInfo("开启幻灯片模式!");
            setCookie("slideShowMode",true,-1);
            slideShow();
            
        }
    }
    function slideShow() {
        if (slideShowMode){
            if (imgLoadComplete){
                run();
            }else{
                controlPanelInfo("图片尚未加载完成");
                clearTimeout(slideShowLoop);
                slideShowMode = false;
                controlPanelInfo("关闭幻灯片模式!");
                setCookie("slideShowMode",false,-1);
            }
        }else{
            clearTimeout(slideShowLoop);
        }
    }
    function run(){
        controlPanelInfo(nextTimeOut+"秒后翻页");
        slideShowLoop = setTimeout(function(){
            next();
        },nextTimeOut*1000);


        /*
        slideShowLoop = setInterval(
            function(){
                if (imgLoadComplete){
                    imgLoadComplete = false;
                    nextp();
                }
        }, 10);
        */
    }

    function nextTimeOutAdd() {
        nextTimeOut++;
        controlPanelInfo("间隔为:"+nextTimeOut+"秒");
        var t= new Date();
        setCookie("nextTimeOut",nextTimeOut,365 * 24 * 60 * 60 * 1000);
    }
    function nextTimeOutSub() {
        nextTimeOut--;
        controlPanelInfo("间隔为:"+nextTimeOut+"秒");
        var t= new Date();
        setCookie("nextTimeOut",nextTimeOut,365 * 24 * 60 * 60 * 1000);
    }
    function next() {
        if(document.getElementById('next').parentNode.childNodes[2].childNodes[0].innerHTML == document.getElementById('next').parentNode.childNodes[2].childNodes[2].innerHTML){
            controlPanelInfo("这是最后一页!");
            slideShowMode = false;
            setCookie("slideShowMode",false,-1);
        }else{
            document.getElementById('next').onclick();
        }
    }
    function previous() {
        if(document.getElementById('prev').parentNode.childNodes[2].childNodes[0].innerHTML == "1"){
            controlPanelInfo("这是第一页!");
            slideShowMode = false;
            setCookie("slideShowMode",false,-1);
        }else{
            document.getElementById('prev').onclick();
        }
    }
})();