const acceptedImages = [ "jpg","png","jpeg","jiff","tiff","gif","gifv" ]

// Initialize the Chrome Extension
chrome.runtime.onInstalled.addListener(function() {
	// Get System Config
	chrome.storage.local.get(['api_server', 'system_id', 'api_key'], function(settings) {
		console.log('Settings retrieved', settings);

		if (settings.api_server != '' && settings.api_key != '' && settings.system_id != '') {
			let configurationAPI
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
								init()
							} else {
								console.log(response)
								alert('Failed to verify transport keys')
							}
						})
						.catch(function (error) {
							console.log(error)
							// This is where you run code if the server returns any errors
						});
				})
				.catch(function (error) {
					console.log(error)
					// This is where you run code if the server returns any errors
				});

			// Initialize the Extension Menu Items
			function init() {
				let menuSendText = []
				let menuSendLink = []
				let menuSendImag = []
				let twitterID = ""
				let gifID = ""
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

				function onClickHandler(info, tab) {
					function sendItem(message) {
						var baseUrl = `${settings.api_server}/endpoint/sendContentGeneral`;
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

					console.log(info)
					console.log(tab)

					let channelNumber = info.menuItemId.split("-").pop()
					if (info.menuItemId.includes("tweet")) {
						let messageText = ""
						if (info.selectionText) {
							messageText = "" + info.selectionText
						}
						if (info.srcUrl) {
							sendItem(`itemType=file&itemFileType=url&itemFileData=${btoa(unescape(encodeURIComponent(info.srcUrl)))}&itemFileName=${info.srcUrl.split('/').pop()}` +
								`&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${channelNumber}`)
						} else {
							if (info.linkUrl) {
								messageText = `${messageText}\n${info.linkUrl}`
							} else if (info.pageUrl) {
								messageText = `${messageText}\n${info.pageUrl}`
							}
							sendItem(`itemType=text&messageText=${messageText.substring(0, 280)}&messageChannelID=${channelNumber}`)
						}
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
							} else if (FileExtention.includes("jpglarge")) {
								FileName = sourceLink.split('/').pop().replace("jpglarge", "jpg")
							}
							const messageText = '**🎨 Image** - `' + info.pageUrl + '`'
							sendItem('itemType=file&itemFileType=url&itemFileData=' + btoa(unescape(encodeURIComponent(sourceLink))) + '&itemFileName=' + FileName +
								'&messageText=' + btoa(unescape(encodeURIComponent(messageText))) + '&messageChannelID=' + channelNumber)
						} else {
							let sourceLink = ""
							if (info.linkUrl) {
								sourceLink = info.linkUrl
							} else if (info.pageUrl) {
								sourceLink = info.pageUrl
							}
							const messageText = `**🔗 ${tab.title}** - ***${encodeURI(sourceLink)}***`
							sendItem(`itemType=text&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${channelNumber}`)
						}
					} else {
						alert("Not understood")
					}
				};


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
		}
	});

	chrome.browserAction.onClicked.addListener(function(tab) {
		alert("Reloaded Kanmi")
		chrome.runtime.reload();
	});
});
