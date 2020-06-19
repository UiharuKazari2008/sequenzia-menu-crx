// Saves options to chrome.storage
function save_options() {
    let system_id = document.getElementById('system_id').value;
    let api_key = document.getElementById('api_key').value;
    let api_server = document.getElementById('api_server').value;
    chrome.storage.local.set({
        system_id: system_id,
        api_key: api_key,
        api_server: api_server,
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved. Please reload the extention by clicking the extention icon';
        setTimeout(function() {
            status.textContent = '';
        }, 2000);
    })
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.local.get({
        system_id: '',
        api_key: '',
        api_server: '',
    }, function(items) {
        document.getElementById('system_id').value = items.system_id;
        document.getElementById('api_key').value = items.api_key;
        document.getElementById('api_server').value = items.api_server;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);