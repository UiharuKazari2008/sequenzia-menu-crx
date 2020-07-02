const acceptedImages = [ "jpg","png","jpeg","jiff","tiff","gif","gifv" ]
let transportKey = ''
let apiServerUrl = ''
let apiSystemId = ''

// Check transport key
function checkLogin(key, ok) {
	// Verify Transport Keys, if valid Initlize the menu items
	if (apiServerUrl !== '' && apiSystemId !== '') { // Ensure API Server URL and System ID are configured
		fetch(`${apiServerUrl}/endpoint/verifyPing`, {
			method: 'GET',
			headers: {
				'Content-type': 'application/x-www-form-urlencoded',
				'X-User-Agent': `KanmiChromeExt/${apiSystemId}`,
				'X-WSS-Key': `${key}`
			}
		})
			.then((resp) => resp.text())
			.then(function (response) {
				if (response == "Valid Key") {
					console.log("Valid Login")
					ok(true)
				} else {
					console.log("Failed to Login due to transport key was not valid")
					console.log(response)
					ok(false)
				}
			})
			.catch(function (error) {
				console.log(error)
				alert("Error attempting to get verify connection")
				console.log("Error attempting to get verify connection")
				ok(false)
			});
	} else { // No Globals were found
		console.log("No API Server or System ID was set!")
		ok(false)
	}
}
// Loads the local settings, updates the transport key, and returns the remote configuration object
function loadConfig(ok) {
	chrome.storage.local.get(['api_server', 'system_id', 'api_key'], function(settings) {
		console.log('Local Configuration:', settings);
		if (settings.api_server !== '' && settings.api_system_id !== '' && settings.api_key !== '') {
			apiServerUrl = settings.api_server
			apiSystemId = settings.system_id
			fetch(`${apiServerUrl}/endpoint/getConfig`, {
				method: 'GET',
				headers: {
					'Content-type': 'application/x-www-form-urlencoded',
					'X-User-Agent': `KanmiChromeExt/${settings.system_id}`,
					'X-API-Key': `${settings.api_key}`
				}
			})
				.then((resp) => resp.json())
				.then(function (data) {
					console.log('Remote Configuration:')
					console.log(data)
					checkLogin(data.wss_key, function (check) {
						if (check) {
							// Save Transport Key Globaly
							transportKey = data.wss_key
							// Send back Configuration'
							ok(data)
						} else {
							console.log('Transport Key is no longer valid or never was')
							alert("Failed to verify configuration\n" +
								"   - Unable to connect to the API\n" +
								"   - The Transport Key is no longer valid (Are you sharing API Keys?)\n" +
								"   - Your extensions settings are missing, invalid, or revoked")
							ok(false)
						}
					})
				})
				.catch(function (error) {
					alert("Failed to get configuration\n" +
						"   - Unable to connect to the API\n" +
						"   - The API Key is incorrect\n" +
						"   - Your extensions settings are missing, invalid, or revoked")
					console.log("Error attempting to load client configuration from API")
					console.log(error)
					ok(false)
				});
		} else {
			console.log("Local Configuration is not valid")
			alert("Local Settings are not valid\n" +
				"   - Your extensions settings are missing, invalid, or revoked")
			ok(false)
		}
	})
}
// Generates the contextual menu items
function generateContexMenu(config, ok) {
	// Start with a menu context menu
	chrome.contextMenus.removeAll(function () {
		// Empty Root and Submenus
		let rootMenu = [];
		let menuSendText = [];
		let menuSendLink = [];
		let menuSendImag = [];
		// Const Channels
		let	gifID = "";
		let twitterID = "";
		let downloadID = "";

		// Setup Submenu Items
		// Text Selection Listeners
		for (let item of config.destination_text) {
			if (item.name === "Twitter") { // Set Twitter Channel
				twitterID = "tweet-" + item.id
			} else if (item.name !== "Download" && item.name !== "GIF") { // Filter out preset const's
				const channelID = 'text-' + item.id
				let channelName = item.name
				if (item.name.includes("-")) { // Add '(Sub Name)' for items that have '-'
					channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
				}
				// Create Submenu Item
				menuSendText.push({
					id: channelID,
					title: channelName,
					contexts: ["selection", "editable"],
					act: (info, tab) => {
						onClickHandler(info, tab, info.menuItemId)
					}
				})
			}
		}
		// Set GIF Channel first
		for (let item of config.destination_imag) {
			if (item.name === "GIF") {
				gifID = "" + item.id
			}
		}
		// Image File Listeners
		for (let item of config.destination_imag) {
			if (item.name === "Download") { // Set Downloads Channel
				downloadID = "download-" + item.id
			} else if (item.name !== "Twitter" && item.name !== "GIF") { // Set All other channels
				let channelName, channelID
				if (item.name === "Pictures" && gifID !== "") { // Add Pictures + GIF Channel (if GIF channel exists)
					channelName = item.name + " / GIFs"
					channelID = `imag-${item.id}-${gifID}`
				} else if (item.name.includes("-")) { // Add '(Sub Name)' for items that have '-'
					channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
				} else { // Add other custom menu items
					channelName = item.name
					channelID = `imag-${item.id}`
				}
				// Create Submenu Item
				menuSendImag.push({
					id: channelID,
					title: channelName,
					contexts: ["image"],
					act: (info, tab) => {
						onClickHandler(info, tab, info.menuItemId)
					}
				})
			}
		}
		// General Link Listeners
		for (let item of config.destination_link) {
			if (item.name !== "Twitter" && item.name !== "Download" && item.name !== "GIF") { // Filter out preset const's
				let channelName, channelID
				if (item.name !== "Download" && item.name === "Pictures" && gifID !== "") { // Add Pictures + GIF Channel (if GIF channel exists)
					channelName = item.name + " / GIFs"
					channelID = `link-${item.id}`
				} else if (item.name.includes("-")) { // Add '(Sub Name)' for items that have '-'
					channelName = `${item.name.split("-")[0]} (${item.name.split("-")[1]})`
					channelID = `link-${item.id}-${gifID}`
				} else { // Add other custom menu items
					channelName = item.name
					channelID = `link-${item.id}`
				}
				// Create Submenu Item
				menuSendLink.push({
					id: channelID,
					title: channelName,
					contexts: ["link", "page"],
					act: (info, tab) => {
						onClickHandler(info, tab, info.menuItemId)
					}
				})
			}
		}


		// Setup Root Menu Items
		// Twitter Outbox
		if (twitterID !== "") {
			rootMenu.push({
				id: twitterID,
				title: '✉️ Send to Twitter',
				contexts: ["selection", "editable", "link", "page", "image"],
				act: (info, tab) => {
					onClickHandler(info, tab)
				}
			})
		} else {
			console.log("No Twitter Channel was found")
		}
		// Download Folder
		if (downloadID !== "") {
			rootMenu.push({
				id: downloadID,
				title: '📤 Download File',
				contexts: ["link", "image"],
				act: (info, tab) => {
					onClickHandler(info, tab)
				}
			})
		} else {
			console.log("No Download Channel was found")
		}
		// Text
		if (menuSendText.length > 0) {
			rootMenu.push({
				id: 'text', title: '📋 Text Selection', contexts: ["selection", "editable"], act: (info, tab) => {
					onClickHandler(info, tab)
				}, menu: menuSendText
			})
		} else {
			console.log("No Text Channels were found")
		}
		// Links
		if (menuSendLink.length > 0) {
			rootMenu.push({
				id: 'link', title: '🔗 Link', contexts: ["link", "page"], act: (info, tab) => {
					onClickHandler(info, tab)
				}, menu: menuSendLink
			})
		} else {
			console.log("No Link Channels were found")
		}
		// Images
		if (menuSendImag.length > 0) {
			rootMenu.push({
				id: 'imag', title: '🎨 Image', contexts: ["image"], act: (info, tab) => {
					onClickHandler(info, tab)
				}, menu: menuSendImag
			})
		} else {
			console.log("No Image Channels were found")
		}

		// Genereate the contextual menu
		if (rootMenu.length > 0) {
			const listeners = {};
			// Generate a menu of items
			const addMenu = (menu, root = null) => {
				// Generate each menu
				for (let item of menu) {
					let {id, menu, act, title, contexts} = item;
					chrome.contextMenus.create({
						id: id,
						title: title,
						contexts: contexts,
						parentId: root
					});
					// Add listener
					if (act) {
						listeners[id] = act;
					}
					// If there are submenu items create them
					if (menu) {
						addMenu(menu, id);
					}
				}
			};
			// Create Root Menu
			addMenu(rootMenu);
			// Add Chrome listener
			chrome.contextMenus.onClicked.addListener((info, tab) => {
				listeners[info.menuItemId](info, tab);
			});
			ok (true)
		} else {
			console.log('Failed to generate any menu items')
			ok(false)
		}
	})
}
// Sends a POST to the API
function sendItem(message,ok) {
	console.log(message)
	if (apiServerUrl !== '' && apiSystemId !== '' && transportKey !== '') {
		fetch(`${apiServerUrl}/endpoint/sendContent/v2`, {
			method: 'POST',
			body: message,
			headers: {
				'Content-type': 'application/x-www-form-urlencoded',
				'X-User-Agent': `KanmiChromeExt/${apiSystemId}`,
				'X-WSS-Key': `${transportKey}`
			}
		})
			.then((response) => response.text())
			.then(function(response) {
				if (response.includes('OK')) {

				} else {
					console.log('Failed to send your content : ' + response)
					alert("Failed to send your request: " + response)
				}
			})
			.catch(function(error){
				console.log('Failed to send your content')
				console.log(error)
				alert("Failed to send your request\n" + error.message.toString())
			})
	} else {
		console.log('Some required instance configuration is missing')
	}
}
// Sends a POST to the API with user confirmation
function confirmItem(message, text, ok) {
	console.log(message)
	const check = confirm(text);
	if (apiServerUrl !== '' && apiSystemId !== '' && transportKey !== '') {
		if (check) {
			fetch(`${apiServerUrl}/endpoint/sendContent/v2`, {
				method: 'POST',
				body: message,
				headers: {
					'Content-type': 'application/x-www-form-urlencoded',
					'X-User-Agent': `KanmiChromeExt/${apiSystemId}`,
					'X-WSS-Key': `${transportKey}`
				}
			})
				.then((response) => response.text())
				.then(function(response) {
					if (response.includes('OK')) {

					} else {
						console.log('Failed to send your content : ' + response)
						alert("Failed to send your request: " + response)
					}
				})
				.catch(function (error) {
					console.log('Failed to send your content')
					console.log(error)
					alert("Failed to send your request\n" + error.message.toString())
				})
		} else {
			console.log("Request canceled")
		}
	} else {
		console.log('Some required instance configuration is missing')
	}
}
// Handle menu item actions
function onClickHandler(info, tab) {
	// Read Cookies for the current page
	let cookieString = ''
	chrome.cookies.getAll({domain: info.pageUrl.split('/')[2] }, (cookie) => {
		// Generate a Cookie String
		for (const item of cookie) {
			cookieString += `${item.name}=${item.value};`
		}

		// Print Returned Inputs
		console.log(info)
		console.log(tab)
		console.log(cookieString)

		// Generate Static Message Data
		let messageData = 'itemReferral=' + btoa(unescape(encodeURIComponent(`https://${info.pageUrl.split('/')[2]}/`)))

		// Parse the Menu Item
		if (info.menuItemId.split('-')[0] === "tweet") {
			let messageText = ""
			let isPossibleFile
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
					if (acceptedImages.includes(info.linkUrl.split('/').pop().toLowerCase())) {
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
				let FileName = fileURL.split('/').pop()
				if (FileName.includes(":")) {
					FileName = sourceLink.split('/').pop().split(":")[0]
				}
				if (FileName.includes("?")) {
					FileName = sourceLink.split('/').pop().split("?")[0]
				}
				messageData += '&itemType=file' +
					'&itemCookies=' + btoa(unescape(encodeURIComponent(cookieString))) +
					'&itemFileType=url' +
					'&itemFileData=' + btoa(unescape(encodeURIComponent(fileURL))) +
					'&itemFileName=' + FileName
				messageText = '#KanmiShare'
			} else {
				messageData += 'itemType=text'
			}
			confirmItem( messageData +
				'&messageText=' + btoa(unescape(encodeURIComponent(messageText))) +
				'&messageChannelID=' + info.menuItemId.split("-")[1], messageText)
		} else if (info.menuItemId.split('-')[0] === "text" ) {
			const messageText = `**📋 Text Selection** - ***${tab.url}***\n` + '`' + info.selectionText.substring(0, 1800) + '`'
			sendItem(`itemType=text&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${info.menuItemId.split("-")[1]}`)
		} else if (info.menuItemId.split('-')[0] === "download") {
			const sourceLink = ((info.srcUrl) ? info.srcUrl : info.linkUrl )
			let FileName = sourceLink.split('/').pop()
			if (FileName.includes(":")) { FileName = FileName.split(":")[0] }
			if (FileName.includes("?")) { FileName = FileName.split("?")[0] }
			const messageText = '**🌐 Download** - `' + info.pageUrl + '`'
			messageData += '&itemType=file' +
				'&itemCookies=' + btoa(unescape(encodeURIComponent(cookieString))) +
				'&itemFileType=url' +
				'&itemFileData=' + btoa(unescape(encodeURIComponent(sourceLink))) +
				'&itemFileName=' + FileName +
				'&messageText=' + btoa(unescape(encodeURIComponent(messageText))) +
				'&messageChannelID=' + info.menuItemId.split("-")[1]
			sendItem(messageData)
		} else if (info.menuItemId.split('-')[0] === "link" || info.menuItemId.split('-')[0] === "imag") {
			let isPossibleFile
			if (info.linkUrl) {
				if (info.linkUrl.includes(".")) {
					isPossibleFile = acceptedImages.includes(info.linkUrl.split('/').pop().split(".").pop().toLowerCase())
				} else {
					isPossibleFile = false
				}
			}
			if (info.srcUrl || isPossibleFile ) {
				const sourceLink = ((info.menuItemId.includes("link")) ? info.linkUrl : info.srcUrl)
				// If GIF image and channel exists else channel number
				const channelNumber = ((info.menuItemId.length === 3 && sourceLink.includes(".") && sourceLink.split('/').pop().split(".").pop().toLowerCase().includes("gif")) ? info.menuItemId.split("-")[2] : info.menuItemId.split("-")[1])
				// Clean up Filename
				let FileName = sourceLink.split('/').pop()
				if (FileName.includes(":")) {
					FileName = sourceLink.split('/').pop().split(":")[0]
				}
				if (FileName.includes("?")) {
					FileName = sourceLink.split('/').pop().split("?")[0]
				}
				messageData += '&itemType=file' +
					'&itemCookies=' + btoa(unescape(encodeURIComponent(cookieString))) +
					'&itemFileType=url' +
					'&itemFileData=' + btoa(unescape(encodeURIComponent(sourceLink))) +
					'&itemFileName=' + FileName +
					'&messageText=' + btoa(unescape(encodeURIComponent('**🎨 Image** - `' + info.pageUrl + '`'))) +
					'&messageChannelID=' + channelNumber
				sendItem(messageData)
			} else {
				let sourceLink = ""
				if (info.linkUrl) {
					sourceLink = info.linkUrl
				} else if (info.pageUrl) {
					sourceLink = info.pageUrl
				}
				// If YouTube link else standard Link text
				const messageText = (( sourceLink.includes("youtube.com") || sourceLink.includes("youtu.be")) ? `**📼 ${tab.title}** - ***${encodeURI(sourceLink)}***` : `**🔗 ${tab.title}** - ***${encodeURI(sourceLink)}***`)
				sendItem(`itemType=text&messageText=${btoa(unescape(encodeURIComponent(messageText)))}&messageChannelID=${info.menuItemId.split("-")[1]}`)
			}
		} else {
			alert("Not understood")
		}
	})
};
// Preform a full reload or Inital load
// Load Config and Generate Menu Items
function loadExtension() {
	loadConfig(function (config) {
		if (config) {
			generateContexMenu(config, function (valid) {
				if (valid) {
					console.log("Extension is ready and in standby!")
				} else {
					console.log("Extension failed to load correctly!")
					chrome.contextMenus.removeAll(() => {})
				}
			})
		} else {
			console.log("Extension failed to load correctly!")
			chrome.contextMenus.removeAll(() => {})
		}
	})
}

// On Chrome Startup
chrome.runtime.onStartup.addListener(function() {
	loadExtension()
});
// On Install or Manual Reload
chrome.runtime.onInstalled.addListener(function() {
	loadExtension()
});
// On Button Click
// TODO: Change Icon to indicate a successful publish
chrome.browserAction.onClicked.addListener(function(tab) {
	alert("Reloading Configuration")
	loadExtension()
	//chrome.runtime.reload();
});
