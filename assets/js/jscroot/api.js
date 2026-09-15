export function getJSON(target_url, responseFunction, tokenkey = null, tokenvalue = null) {
    let myHeaders = new Headers();

    // Jika token disediakan, tambahkan header token
    if (tokenkey && tokenvalue) {
        myHeaders.append(tokenkey, tokenvalue);
    }

    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    let requestOptions = {
        method: 'GET',
        redirect: 'follow',
        headers: myHeaders
    };

    fetch(target_url, requestOptions)
        .then(response => {
            const status = response.status;
            return response.text().then(result => {
                const parsedResult = JSON.parse(result);
                responseFunction({ status, data: parsedResult });
            });
        })
        .catch(error => console.log('error', error));
}

export function postJSON(target_url, datajson, responseFunction, tokenkey = null, tokenvalue = null) {
    var myHeaders = new Headers();

    // Jika token disediakan, tambahkan header token
    if (tokenkey && tokenvalue) {
        myHeaders.append(tokenkey, tokenvalue);
    }

    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    var raw = JSON.stringify(datajson);

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(target_url, requestOptions)
        .then(response => {
            const status = response.status;
            return response.text().then(result => {
                const parsedResult = JSON.parse(result);
                responseFunction({ status, data: parsedResult });
            });
        })
        .catch(error => console.log('error', error));
}

export function deleteJSON(target_url, datajson, responseFunction, tokenkey = null, tokenvalue = null) {
    var myHeaders = new Headers();

    // Jika token disediakan, tambahkan header token
    if (tokenkey && tokenvalue) {
        myHeaders.append(tokenkey, tokenvalue);
    }

    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    var raw = JSON.stringify(datajson);

    var requestOptions = {
        method: 'DELETE',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(target_url, requestOptions)
        .then(response => {
            const status = response.status;
            return response.text().then(result => {
                const parsedResult = JSON.parse(result);
                responseFunction({ status, data: parsedResult });
            });
        })
        .catch(error => console.log('error', error));
}


// function responseFunction(response) {
//     console.log('HTTP Status:', response.status);
//     console.log('Response Data:', response.data);
// }
export function putJSON(target_url, datajson, responseFunction, tokenkey = null, tokenvalue = null) {
    var myHeaders = new Headers();

    // Jika token disediakan, tambahkan header token
    if (tokenkey && tokenvalue) {
        myHeaders.append(tokenkey, tokenvalue);
    }

    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "application/json");

    var raw = JSON.stringify(datajson);

    var requestOptions = {
        method: 'PUT',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    fetch(target_url, requestOptions)
        .then(response => {
            const status = response.status;
            return response.text().then(result => {
                const parsedResult = JSON.parse(result);
                responseFunction({ status, data: parsedResult });
            });
        })
        .catch(error => console.log('error', error));
}

export function insertHTML(target_url,id,runFunction){
    var requestOptions = {
    method: 'GET',
    redirect: 'follow'
    };

    fetch(target_url, requestOptions)
    .then(response => response.text())
    .then(result => document.getElementById(id).innerHTML = result)
    .then(() => runFunction())
    .catch(error => console.log("Not Found Element id : "+id+", please make sure the id attribut is exist to render html from "+target_url+" . If doesn't you'll get", error));
}

export function getDomHTML(target_url,domFunction){
    var requestOptions = {
    method: 'GET',
    redirect: 'follow'
    };

    fetch(target_url, requestOptions)
    .then(response => response.text())
    .then(result => {
        const parser = new DOMParser();
        const htmlDom = parser.parseFromString(result, "text/html");
        domFunction(htmlDom);
    })
    .catch(error => console.log('error', error));
}

export function postFile(target_url,id,formdataname,responseFunction) {
    const input = document.getElementById(id);
    const file = input.files[0];
    const formData = new FormData();
    formData.append(formdataname, file);
    var requestOptions = {
        method: 'POST',
        body: formData,
        redirect: 'follow'
        };
    
    fetch(target_url, requestOptions)
    .then(response => response.text())
    .then(result => responseFunction(JSON.parse(result)))
    .catch(error => console.log('error', error));
}

//make sure formdataname use in the backend to get data file
export function postFileWithHeader(target_url,tokenkey,tokenvalue,id,formdataname,responseFunction) {
    let myHeaders = new Headers();
    myHeaders.append(tokenkey, tokenvalue);
    myHeaders.append("Accept", "application/json");

    const input = document.getElementById(id);
    const file = input.files[0];
    const formData = new FormData();
    formData.append(formdataname, file);
    var requestOptions = {
        method: 'POST',
        body: formData,
        redirect: 'follow',
        headers: myHeaders
        };
    
    fetch(target_url, requestOptions)
    .then(response => response.text())
    .then(result => responseFunction(JSON.parse(result)))
    .catch(error => console.log('error', error));
}

// function responseFunction(response) {
//     console.log('HTTP Status:', response.status);
//     console.log('Response Data:', response.data);
// }
export function postFileJSON(target_url, tokenkey, tokenvalue, id, formdataname, responseFunction) {
    let myHeaders = new Headers();
    myHeaders.append(tokenkey, tokenvalue);
    myHeaders.append("Accept", "application/json");

    const input = document.getElementById(id);
    const file = input.files[0];
    const formData = new FormData();
    formData.append(formdataname, file);

    var requestOptions = {
        method: 'POST',
        body: formData,
        redirect: 'follow',
        headers: myHeaders
    };

    fetch(target_url, requestOptions)
    .then(response => response.text().then(data => ({
        status: response.status,
        data: data
    })))
    .then(result => responseFunction({
        status: result.status,
        data: JSON.parse(result.data)
    }))
    .catch(error => console.log('error', error));
}

//get file and download it into your browser, if not 200 then return json
export function getFileWithHeader(target_url, tokenkey, tokenvalue, responseFunction, fileName) {
    let myHeaders = new Headers();
    myHeaders.append(tokenkey, tokenvalue);

    let requestOptions = {
        method: 'GET',
        redirect: 'follow',
        headers: myHeaders
    };

    fetch(target_url, requestOptions)
        .then(response => {
            if (response.status === 200) {
                // Jika status 200, download file
                return response.blob().then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    //let base64fileurl = target_url.split('/').pop();
                    a.download = fileName; // Nama file dari URL
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                });
            } else {
                // Jika status selain 200, parse sebagai JSON
                return response.json().then(result => responseFunction(result));
            }
        })
        .catch(error => console.log('error', error));
}

//get file bytes if 200, othen than return json
export function getFileBytesWithHeader(target_url, tokenkey, tokenvalue, responseFunction) {
    let myHeaders = new Headers();
    myHeaders.append(tokenkey, tokenvalue);

    let requestOptions = {
        method: 'GET',
        redirect: 'follow',
        headers: myHeaders
    };

    fetch(target_url, requestOptions)
        .then(response => {
            if (response.status === 200) {
                // Jika status 200, return fileBytes
                return response.arrayBuffer();
            } else {
                // Jika status selain 200, parse sebagai JSON
                return response.json().then(result => responseFunction(result));
            }
        })
        .catch(error => console.log('error', error));
}