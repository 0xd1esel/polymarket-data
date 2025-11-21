const API_BASE = window.location.origin;

let currentJobId = null;
let currentFilename = null;

// DOM Elements
const mainView = document.getElementById('main-view');
const downloadView = document.getElementById('download-view');
const thankYouView = document.getElementById('thank-you-view');

const slugInput = document.getElementById('slug-input');
const fetchBtn = document.getElementById('fetch-btn');
const downloadBtn = document.getElementById('download-btn');
const fetchAnotherBtn = document.getElementById('fetch-another-btn');
const statusMessage = document.getElementById('status-message');

// Event Listeners
fetchBtn.addEventListener('click', handleFetch);
downloadBtn.addEventListener('click', handleDownload);
fetchAnotherBtn.addEventListener('click', handleFetchAnother);

// Allow Enter key to trigger fetch
slugInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleFetch();
    }
});

/**
 * Handle fetch button click
 */
async function handleFetch() {
    const slug = slugInput.value.trim();

    if (!slug) {
        showStatus('Please enter a market slug', 'error');
        return;
    }

    // Disable button and show loading
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<span class="spinner"></span> Fetching...';
    showStatus('Starting fetch...', 'info');

    try {
        // Start the fetch job
        const response = await fetch(`${API_BASE}/api/fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ slug, useCache: true }),
        });

        if (!response.ok) {
            throw new Error('Failed to start fetch');
        }

        const data = await response.json();
        currentJobId = data.jobId;

        // Poll for status
        pollJobStatus();
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch';
    }
}

/**
 * Poll job status until complete
 */
async function pollJobStatus() {
    if (!currentJobId) return;

    try {
        const response = await fetch(`${API_BASE}/api/status/${currentJobId}`);
        const job = await response.json();

        // Update status message
        showStatus(job.progress, 'info');

        if (job.status === 'completed') {
            currentFilename = job.filePath;
            showDownloadView();
        } else if (job.status === 'error') {
            showStatus(`Error: ${job.error}`, 'error');
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Fetch';
        } else {
            // Keep polling
            setTimeout(pollJobStatus, 1000);
        }
    } catch (error) {
        console.error('Error polling status:', error);
        showStatus('Error checking status', 'error');
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch';
    }
}

/**
 * Handle download button click
 */
function handleDownload() {
    if (!currentFilename) {
        showStatus('No file available for download', 'error');
        return;
    }

    // Trigger download
    const downloadUrl = `${API_BASE}/api/download/${currentFilename}`;
    window.location.href = downloadUrl;

    // Show thank you view after a short delay
    setTimeout(() => {
        showThankYouView();
    }, 500);
}

/**
 * Handle fetch another button click
 */
function handleFetchAnother() {
    // Reset state
    currentJobId = null;
    currentFilename = null;
    slugInput.value = '';
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch';
    hideStatus();
    
    // Show main view
    showMainView();
}

/**
 * Show status message
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

/**
 * Hide status message
 */
function hideStatus() {
    statusMessage.className = 'status-message hidden';
}

/**
 * Show main view
 */
function showMainView() {
    mainView.classList.add('active');
    downloadView.classList.remove('active');
    thankYouView.classList.remove('active');
}

/**
 * Show download view
 */
function showDownloadView() {
    mainView.classList.remove('active');
    downloadView.classList.add('active');
    thankYouView.classList.remove('active');
}

/**
 * Show thank you view
 */
function showThankYouView() {
    mainView.classList.remove('active');
    downloadView.classList.remove('active');
    thankYouView.classList.add('active');
}

