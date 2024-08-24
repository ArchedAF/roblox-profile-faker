document.getElementById('saveBtn').addEventListener('click', () => {
    const userId = document.getElementById('userId').value;
    const customRobuxValue = document.getElementById('robuxAmount').value;

    if (userId && customRobuxValue) {
        chrome.storage.sync.set({ userId, customRobuxValue }, () => {
            document.getElementById('status').textContent = 'User ID and Robux amount saved!';
        });
    } else {
        document.getElementById('status').textContent = 'Please enter a valid User ID and Robux amount.';
    }
});
