export function container(id){
    return document.getElementById(id);
}

export function onClick(id, actionFunctionName) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener("click", (event) => actionFunctionName(event.target));
    } else {
        console.warn(`Elemen dengan ID "${id}" tidak ditemukan.`);
    }
}

export function onClicks(className, actionFunctionName) {
    let elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].onclick = (event) => actionFunctionName(event.target);
    }
}

export function onChange(id,actionfunctionname){
    document.getElementById(id).onchange = function(event) {actionfunctionname(event.target)};
}

export function onChanges(className, actionFunctionName) {
    let elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].onchange = function(event) {
            actionFunctionName(event.target);
        };
    }
}

export function onInput(id,actionfunctionname){
    document.getElementById(id).oninput = function(event) {actionfunctionname(event.target)};
}

export function onInputs(className, actionFunctionName) {
    let elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].oninput = function(event) {
            actionFunctionName(event.target);
        };
    }
}

export function runAfterDOM(runFunctionEvent){
    window.addEventListener('DOMContentLoaded',(event) => {runFunctionEvent(event)});
}

export function runAfterAll(runFunctionEvent){
    window.addEventListener('load', (event) => {runFunctionEvent(event)});
}

export function textFocus(id){
    document.getElementById(id).focus();
}

export function textBlur(id){
    document.getElementById(id).blur();
}

export function getValue(id){
    return document.getElementById(id).value;
}

export function getAttributeValue(id,attribute) {
    return document.getElementById(id).getAttribute(attribute);
}

export function getValueRadio(name){
    const RadioButtons = document.getElementsByName(name);
    let selectedValue;

    RadioButtons.forEach(radioButton => {
        if (radioButton.checked) {
            selectedValue = radioButton.value;
        }
        console.log("Selected Value:", selectedValue);
    });
    return selectedValue;
}

export function getValueSelect(id){
    const sel = document.getElementsByName(id);
    return sel.options[sel.selectedIndex].value;
}

export function getTextSelect(id){
    const sel = document.getElementsByName(id);
    return sel.options[sel.selectedIndex].text;
}

export function getFileSize(id){
    let inputElement = document.getElementById(id);
    let files = inputElement.files;
    let fileSize = files[0].size;
    let fileSizeInKB = (fileSize/1024);
    return fileSizeInKB;
}

export function setValue(id,valuecontent){
    return document.getElementById(id).value=valuecontent;
}

export function setInner(id,content){
    document.getElementById(id).innerHTML = content;
}

export function setInnerText(id,content){
    document.getElementById(id).innerText = content;
}

export function addInner(id,content){
    document.getElementById(id).innerHTML += content;
}

export function addChild(id, tag, classvalue, content) {
    let el = document.createElement(tag);
    if (classvalue.trim() !== "") {
        let classArray = classvalue.split(" ");
        classArray.forEach(setClassValue.bind(null, el));
    }
    el.innerHTML = content;
    document.getElementById(id).appendChild(el);
}

export function setClassValue(el, classvalue) {
    if (classvalue.trim() !== "") {
        el.classList.add(classvalue.trim());
    }
}

export function addClassValue(id, classValue){
    document.getElementById(id).classList.add(classValue.trim());
}

export function show(id){
    document.getElementById(id).style.display = 'block';
}

export function hide(id){
    document.getElementById(id).style.display = 'none';
}

export function disableInput(id) {
    const Input = document.getElementById(id);
    Input.disabled = true;
}
export function enableInput(id) {
    const Input = document.getElementById(id);
    Input.disabled = false;
}

export function renderHTML(id, urlHTML, callback = null) {
    // Ambil elemen berdasarkan ID
    const element = document.getElementById(id);
    
    if (!element) {
        console.error(`Element with ID "${id}" not found.`);
        return;
    }

    // Ambil konten HTML dari URL
    fetch(urlHTML)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text(); // Ambil teks HTML dari response
        })
        .then(html => {
            element.innerHTML = html; // Render HTML ke elemen

            // Jika callback ada, jalankan setelah konten dimuat
            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.error('Error loading HTML:', error);
        });
}


export function replaceTag(id, urlHTML, callback = null) {
    const element = document.getElementById(id);

    if (!element) {
        console.error(`Element with ID "${id}" not found.`);
        return;
    }

    fetch(urlHTML)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newElement = doc.body.firstElementChild; // Ambil elemen pertama

            if (newElement) {
                element.replaceWith(newElement); // Gantikan elemen lama dengan yang baru
            } else {
                console.warn(`No valid element found in ${urlHTML}`);
            }

            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.error('Error loading HTML:', error);
        });
}


export function addJSInHead(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(); // Resolves when script is loaded
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
}

export function addCSSInHead(href) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve(); // Resolves when CSS is loaded
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        document.head.appendChild(link);
    });
}

export function isCSSLoaded(href) {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let link of links) {
        if (link.href.includes(href)) {
            return true; // CSS file ditemukan
        }
    }
    return false; // CSS file tidak ditemukan
}

export function isJSLoaded(src) {
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
        if (script.src.includes(src)) {
            return true; // JavaScript file ditemukan
        }
    }
    return false; // JavaScript file tidak ditemukan
}

export async function addJS(src) {
    if (!isJSLoaded(src)) { // Perbaikan: cek jika skrip belum dimuat
        await addJSInHead(src);
    }
}

export async function addCSS(href) {
    if (!isCSSLoaded(href)) { // Perbaikan: cek jika CSS belum dimuat
        await addCSSInHead(href);
    }
}
