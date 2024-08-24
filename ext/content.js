chrome.storage.sync.get(['userId', 'customRobuxValue'], function(result) {
    if (result.userId) {
        updateFriendProfiles(`https://www.roblox.com/users/${result.userId}/profile`);
    } else {
        console.log('No User ID found. Please set it in the extension popup.');
    }

    if (result.customRobuxValue) {
        updateRobuxAmountPersistent(result.customRobuxValue);
    }
});

async function updateFriendProfiles(profileUrl) {
    try {
        const userIdMatch = profileUrl.match(/\/users\/(\d+)\/profile/);
        if (!userIdMatch) {
            console.error("Invalid profile URL");
            return;
        }
        const userId = userIdMatch[1];

        const profileDetailsResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        const profileDetails = await profileDetailsResponse.json();
        const profileDisplayName = profileDetails.displayName;
        const profileUsername = profileDetails.name;

        const headshotResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=png`);
        const headshotData = await headshotResponse.json();
        const headshotUrl = headshotData.data[0].imageUrl;

        const displayNameElement = document.querySelector('.text-overflow.age-bracket-label-username.font-caption-header');
        if (displayNameElement) {
            displayNameElement.textContent = profileDisplayName;
            console.log(`Updated display name to: ${profileDisplayName}`);
        }

        const profileImageElement = document.querySelector('img[src*="AvatarHeadshot"]');
        if (profileImageElement) {
            profileImageElement.src = headshotUrl;
            profileImageElement.alt = profileUsername;
            profileImageElement.title = profileUsername;
            console.log(`Updated profile image to: ${headshotUrl}`);
        }

        const specifiedProfileImage = document.querySelector('img[src*="AvatarHeadshot"]');
        if (specifiedProfileImage) {
            specifiedProfileImage.src = headshotUrl;
            specifiedProfileImage.alt = profileUsername;
            specifiedProfileImage.title = profileUsername;
            console.log(`Updated specified profile image to: ${headshotUrl}`);
        }

        const specifiedProfileName = document.querySelector('.font-header-2.dynamic-ellipsis-item');
        if (specifiedProfileName) {
            specifiedProfileName.textContent = profileDisplayName;
            console.log(`Updated specified profile name to: ${profileDisplayName}`);
        }

        await waitForElements('.friend-link');

        const profileElements = document.querySelectorAll('.friend-link');
        const displayCount = profileElements.length;

        if (displayCount === 0) {
            console.error("No friend profile elements found on the page");
            return;
        }

        console.log(`Number of friend profile elements found on the page: ${displayCount}`);

        const friendsResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/friends`);
        const friendsData = await friendsResponse.json();
        const friends = friendsData.data;

        if (!friends || friends.length === 0) {
            console.error("No friends found or failed to fetch friends");
            return;
        }

        console.log(`Total friends fetched: ${friends.length}`);

        const batchSize = 10;
        const batchedFriends = [];

        for (let i = 0; i < displayCount; i += batchSize) {
            const batch = friends.slice(i, i + batchSize);
            const userIds = batch.map(friend => friend.id).filter(Boolean).join(',');

            if (userIds) {
                const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=150x150&format=png`);
                const avatarData = await avatarResponse.json();

                avatarData.data.forEach((avatar, index) => {
                    batch[index].avatarUrl = avatar.imageUrl || '';
                });

                batchedFriends.push(...batch);
            }
        }

        profileElements.forEach((profileElement, index) => {
            const friend = batchedFriends[index];
            if (friend) {
                profileElement.href = `/users/${friend.id}/profile`;

                const imgElement = profileElement.querySelector('img');
                if (imgElement) {
                    imgElement.src = friend.avatarUrl;
                }

                const nameElement = profileElement.querySelector('.friend-name');
                if (nameElement) {
                    nameElement.textContent = friend.displayName;
                }
            } else {
                profileElement.remove();
                console.log(`Removed excess profile element at index ${index}`);
            }

            const statusElements = profileElement.querySelectorAll('.avatar-status.friend-status.icon-studio');
            statusElements.forEach(statusElement => {
                statusElement.remove();
                console.log('Removed excess avatar-status span');
            });
        });

        if (displayCount > friends.length) {
            for (let i = friends.length; i < displayCount; i++) {
                const excessElement = profileElements[i];
                if (excessElement) {
                    excessElement.remove();
                    console.log(`Removed excess profile element at index ${i}`);
                }
            }
        }

        const friendsCountElement = document.querySelector('.friends-count');
        if (friendsCountElement) {
            friendsCountElement.textContent = `(${friends.length})`;
            console.log(`Updated friends count to: (${friends.length})`);
        }

        const chatLabels = document.querySelectorAll('.text-overflow.border-bottom.label.ng-binding');
        console.log(`Found ${chatLabels.length} chat labels to update.`);

        chatLabels.forEach(labelElement => {
            const title = labelElement.getAttribute('title');
            if (title && title.startsWith('Chat with')) {
                const nameInTitle = title.replace('Chat with ', '');
                console.log(`Checking chat label with title: ${title}`);

                const matchingFriend = friends.find(friend => friend.name === nameInTitle);

                if (matchingFriend) {
                    console.log(`Found match: ${matchingFriend.displayName}`);
                    labelElement.textContent = `Chat with ${matchingFriend.displayName}`;
                    labelElement.setAttribute('title', `Chat with ${matchingFriend.displayName}`);
                    console.log(`Updated chat label for ${matchingFriend.displayName}`);
                } else {
                    console.log(`No matching friend found for: ${nameInTitle}`);
                }
            }
        });

        console.log("Profile updated, friend profiles updated, excess elements removed, friend count updated, and chat labels corrected successfully!");
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

// Utility function to wait until elements are present in the DOM
function waitForElements(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const interval = 100;
        let elapsed = 0;

        const check = () => {
            if (document.querySelector(selector)) {
                resolve();
            } else if (elapsed >= timeout) {
                reject(`Timed out waiting for ${selector}`);
            } else {
                elapsed += interval;
                setTimeout(check, interval);
            }
        };

        check();
    });
}

// Function to update the Robux amount to a custom value
function updateRobuxAmountPersistent(customAmount) {
    function applyRobuxUpdate() {
        const robuxAmountElement = document.getElementById('nav-robux-amount');
        if (robuxAmountElement) {
            robuxAmountElement.textContent = customAmount;
            console.log(`Robux amount updated to: ${customAmount}`);
        } else {
            console.error('Robux amount element not found');
        }
    }

    // Apply the update immediately
    applyRobuxUpdate();

    // Continuously attempt to apply the update every 500ms
    const updateInterval = setInterval(applyRobuxUpdate, 500);

    // Stop the interval after 10 seconds, assuming the update is stable
    setTimeout(() => {
        clearInterval(updateInterval);
    }, 1000);
}
