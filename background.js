const acceptedImages = [ "jpg","png","jpeg","jiff","tiff","gif","gifv" ]

// Initialize the Chrome Extension
chrome.runtime.onStartup.addListener(function() {
	loadExtention()
});
chrome.runtime.onInstalled.addListener(function() {
	loadExtention()
});
chrome.browserAction.onClicked.addListener(function(tab) {
	alert("Reloading Configuration")
	chrome.contextMenus.removeAll(function (){
	})
	chrome.runtime.reload();
});

function loadExtention() {
	// Get System Config
	let configurationAPI = null
	let gifID = null
	chrome.storage.local.get(['api_server', 'system_id', 'api_key'], function(settings) {
		console.log('Settings retrieved', settings);
		function onClickHandler(info, tab) {
			function sendItem(message) {
				console.log(message)
				var baseUrl = `${settings.api_server}/endpoint/sendContent/v2`;
				fetch(baseUrl, {
					method: 'POST',
					body: message,
					headers: {
						'Content-type': 'application/x-www-form-urlencoded',
						'X-User-Agent': `KanmiChromeExt/${settings.system_id}`,
						'X-WSS-Key': `${configurationAPI.wss_key}`
					}
				})
			}
			function confirmItem(message, text) {
				console.log(message)
				var check = confirm(text);
				if (check) {
					var baseUrl = `${settings.api_server}/endpoint/sendContent/v2`;
					fetch(baseUrl, {
						method: 'POST',
						body: message,
						headers: {
							'Content-type': 'application/x-www-form-urlencoded',
							'X-User-Agent': `KanmiChromeExt/${settings.system_id}`,
							'X-WSS-Key': `${configurationAPI.wss_key}`
						}
					})
				}
			}

			console.log(info)
			console.log(tab)

			let channelNumber = info.menuItemId.split("-").pop()
			if (info.menuItemId.includes("tweet")) {
				let messageText = ""
				let isPossibleFile
				let messageData
				if (info.selectionText) {
					messageText = "" + info.selectionText
				}
				let sourceLink = info.srcUrl
				if (info.linkUrl) {
					sourceLink = info.linkUrl
					messageText = sourceLink
				} else if (info.pageUrl) {
					sourceLink = `${info.pageUrl}`
					messageText = sourceLink
				}

				if (info.linkUrl || info.srcUrl) {
					if( info.srcUrl) {
						isPossibleFile = true
					} else if (info.linkUrl.includes(".")) {
						isPossibleFile = true
						if (acceptedImages.includes(info.linkUrl.split('/').pop().toLowerCase()) > -1) {
							isPossibleFile = false
						}
					} else {
						isPossibleFile = false
					}
				}
				if (isPossibleFile ) {
					let fileURL
					if (info.srcUrl) {
						fileURL = info.srcUrl
					} else {
						fileURL = sourceLink
					}
					let FileName = fileURL.split('/').pop().split(".").pop().toLowerCase()
					if (FileName.includes(":")) {
						FileName = sourceLink.split('/').pop().split(":")[0]
					}
					if (FileName.includes("?")) {
						FileName = sourceLink.split('/').pop().split("?")[0]
					}
					messageData = 'itemType=file' +
						'&itemFileType=url' +
						'&itemFileData=' + btoa(unescape(encodeURIComponent(fileURL))) +
						'&itemFileName=' + FileName
					messageText = '#KanmiShare'
				} else {
					messageData = 'itemType=text'
				}
				confirmItem( messageData +
						'&messageText=' + btoa(unescape(encodeURIComponent(messageText))) +
						'&messageChannelID=' + channelNumber, messageText)
			} else if (info.menuItemId.includes("text")) {
				const messageText = `**📋 Text Selection** - ***${tab.url}***\n` + '`' + info.selectionText.substring(0, 1800) + '`'
				sendItem(`itemType=text&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${channelNumber}`)
			} else if (info.menuItemId.includes("link") || info.menuItemId.includes("imag")) {
				let isPossibleFile
				if (info.linkUrl) {
					if (info.linkUrl.includes(".")) {
						isPossibleFile = acceptedImages.includes(info.linkUrl.split('/').pop().split(".").pop().toLowerCase())
					} else {
						isPossibleFile = false
					}
				}
				if (info.srcUrl || isPossibleFile ) {
					let sourceLink = info.srcUrl
					if (info.menuItemId.includes("link")) {
						sourceLink = info.linkUrl
					}
					const FileExtention = sourceLink.split('/').pop().split(".").pop().toLowerCase()
					let FileName = sourceLink.split('/').pop()
					if (FileExtention.includes("gif")) {
						channelNumber = gifID
					}
					if (FileName.includes(":")) {
						FileName = sourceLink.split('/').pop().split(":")[0]
					}
					if (FileName.includes("?")) {
						FileName = sourceLink.split('/').pop().split("?")[0]
					}
					const messageText = '**🎨 Image** - `' + info.pageUrl + '`'
					sendItem('itemType=file&itemFileType=url&itemFileData=' + btoa(unescape(encodeURIComponent(sourceLink))) + '&itemFileName=' + FileName +
						'&messageText=' + btoa(unescape(encodeURIComponent(messageText))) + '&messageChannelID=' + channelNumber)
				} else {
					let messageText = ''
					let sourceLink = ""
					if (info.linkUrl) {
						sourceLink = info.linkUrl
					} else if (info.pageUrl) {
						sourceLink = info.pageUrl
					}
					if ( sourceLink.includes("youtube.com") || sourceLink.includes("youtu.be") ) {
						messageText = `**📼 ${tab.title}** - ***${encodeURI(sourceLink)}***`
					} else {
						messageText = `**🔗 ${tab.title}** - ***${encodeURI(sourceLink)}***`
					}
					sendItem(`itemType=text&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${channelNumber}`)
				}
			} else {
				alert("Not understood")
			}
		};

		if (settings.api_server != '' && settings.api_key != '' && settings.system_id != '') {
			fetch(`${settings.api_server}/endpoint/getConfig`, {
				method: 'GET',
				headers: {
					'Content-type': 'application/x-www-form-urlencoded',
					'X-User-Agent': `KanmiChromeExt/${settings.system_id}`,
					'X-API-Key': `${settings.api_key}`
				}
			})
				.then((resp) => resp.json())
				.then(function (data) {
					configurationAPI = data
					console.log(configurationAPI)

					// Verify Transport Keys, if valid Initlize the menu items
					fetch(`${settings.api_server}/endpoint/verifyPing`, {
						method: 'GET',
						headers: {
							'Content-type': 'application/x-www-form-urlencoded',
							'X-User-Agent': `KanmiChromeExt/${settings.system_id}`,
							'X-WSS-Key': `${data.wss_key}`
						}
					})
						.then((resp) => resp.text())
						.then(function (response) {
							if (response == "Valid Key") {
								console.log(response)
								createMenu()
							} else {
								console.log(response)
								alert("Did not get a valid Transport Key, This could be a server error ")
							}
						})
						.catch(function (error) {
							console.log(error)
							alert("Did not get a valid Transport Key, This could be a server error ")
							// This is where you run code if the server returns any errors
						});
				})
				.catch(function (error) {
					console.log(error)
					alert("Failed to load configuration from API")
					// This is where you run code if the server returns any errors
				});

			// Initialize the Extension Menu Items
			function createMenu() {
				let menuSendText = []
				let menuSendLink = []
				let menuSendImag = []
				let twitterID = ""

				// Find GIF Channel
				for (let item of configurationAPI.destination_imag) {
					if (item.name == "GIF") {
						gifID = "" + item.id
					}
				}


				for (let item of configurationAPI.destination_text) {
					if (item.name !== "Twitter" && item.name !== "GIF") {
						const channelID = 'text-' + item.id
						let channelName = item.name
						if (item.name.includes("-")) {
							channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
						}
						menuSendText.push({
							id: channelID,
							title: "📋 " + channelName,
							contexts: ["selection", "editable"],
							act: (info, tab) => {
								onClickHandler(info, tab, info.menuItemId)
							}
						})
					} else {
						twitterID = "tweet-" + item.id
					}
				}
				for (let item of configurationAPI.destination_link) {
					if (item.name !== "Twitter" && item.name !== "GIF") {
						let channelName
						if (item.name === "Pictures" && gifID !== "") {
							channelName = item.name + " / GIFs"
						} else {
							if (item.name.includes("-")) {
								channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
							} else {
								channelName = item.name
							}
						}
						const channelID = 'link-' + item.id
						menuSendLink.push({
							id: channelID,
							title: "🔗 " + channelName,
							contexts: ["link", "page"],
							act: (info, tab) => {
								onClickHandler(info, tab, info.menuItemId)
							}
						})
					}
				}
				for (let item of configurationAPI.destination_imag) {
					if (item.name !== "Twitter" && item.name !== "GIF") {
						let channelName
						if (item.name === "Pictures" && gifID !== "") {
							channelName = item.name + " / GIFs"
						} else {
							if (item.name.includes("-")) {
								channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
							} else {
								channelName = item.name
							}
						}
						const channelID = 'imag-' + item.id
						menuSendImag.push({
							id: channelID,
							title: "🎨 " + channelName,
							contexts: ["image"],
							act: (info, tab) => {
								onClickHandler(info, tab, info.menuItemId)
							}
						})
					}
				}

				const rootMenu = [
					{
						id: twitterID,
						title: '📤 Send to Twitter',
						contexts: ["selection", "editable", "link", "page", "image"],
						act: (info, tab) => {
							onClickHandler(info, tab)
						}
					},
					{
						id: 'text', title: '📋 Text Selection', contexts: ["selection", "editable"], act: (info, tab) => {
							onClickHandler(info, tab)
						}, menu: menuSendText
					},
					{
						id: 'link', title: '🔗 Link', contexts: ["link", "page"], act: (info, tab) => {
							onClickHandler(info, tab)
						}, menu: menuSendLink
					},
					{
						id: 'imag', title: '🎨 Image', contexts: ["image"], act: (info, tab) => {
							onClickHandler(info, tab)
						}, menu: menuSendImag
					}
				];
				const listeners = {};
				const addMenu = (menu, root = null) => {
					for (let item of menu) {
						let {id, menu, act, title, contexts} = item;
						chrome.contextMenus.create({
							id: id,
							title: title,
							contexts: contexts,
							parentId: root
						});
						if (act) {
							listeners[id] = act;
						}
						if (menu) {
							addMenu(menu, id);
						}
					}
				};

				addMenu(rootMenu);
				chrome.contextMenus.onClicked.addListener((info, tab) => {
					listeners[info.menuItemId](info, tab);
				});
			}
		} else {
			alert("Please configure your API Key and Server in the Extension Settings")
		}
	});
}
