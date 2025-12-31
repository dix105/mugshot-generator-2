document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // MOBILE NAVIGATION (KEPT)
    // =========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.querySelector('i').classList.remove('fa-xmark');
                menuToggle.querySelector('i').classList.add('fa-bars');
            });
        });
    }

    // =========================================
    // SCROLL ANIMATIONS (KEPT)
    // =========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

    // =========================================
    // FAQ ACCORDION (KEPT)
    // =========================================
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isOpen = question.classList.contains('active');

            faqQuestions.forEach(q => {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
            });

            if (!isOpen) {
                question.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // =========================================
    // MODAL LOGIC (KEPT)
    // =========================================
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-modal-target]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    document.querySelectorAll('[data-modal-close]').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modalId = closeBtn.getAttribute('data-modal-close');
            closeModal(document.getElementById(modalId));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // =========================================
    // BACKEND WIRING & LOGIC (MODIFIED)
    // =========================================

    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // State
    let currentUploadedUrl = null;
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    
    // -----------------------------------------
    // API FUNCTIONS
    // -----------------------------------------

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Upload file to CDN storage
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        // Filename is just nanoid.extension (no media/ prefix)
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL from API
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        console.log('Got signed URL');
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        console.log('Uploaded to:', downloadUrl);
        return downloadUrl;
    }

    // Submit generation job
    async function submitImageGenJob(imageUrl) {
        // Hardcoded based on instructions
        const modelType = 'image-effects';
        const isVideo = modelType === 'video-effects';
        const endpoint = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0'
        };

        let body = {
            model: 'image-effects',
            toolType: 'image-effects',
            effectId: 'mugshot',
            imageUrl: imageUrl, 
            userId: USER_ID,
            removeWatermark: true,
            isPrivate: true
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Job submitted:', data.jobId, 'Status:', data.status);
        return data;
    }

    // Poll job status
    async function pollJobStatus(jobId) {
        const POLL_INTERVAL = 2000; // 2 seconds
        const MAX_POLLS = 60; // 2 minutes
        const baseUrl = 'https://api.chromastudio.ai/image-gen'; // Matching submission endpoint logic
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: { 'Accept': 'application/json, text/plain, */*' }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Poll', polls + 1, '- Status:', data.status);
            
            if (data.status === 'completed') {
                console.log('Job completed!');
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // -----------------------------------------
    // UI HELPERS
    // -----------------------------------------

    function showLoading() {
        const loadingState = document.getElementById('loading-state');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const scanOverlay = document.getElementById('scan-overlay');
        
        if (loadingState) loadingState.classList.remove('hidden');
        if (scanOverlay) scanOverlay.classList.remove('hidden');
        if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
    }

    function hideLoading() {
        const loadingState = document.getElementById('loading-state');
        const scanOverlay = document.getElementById('scan-overlay');
        
        if (loadingState) loadingState.classList.add('hidden');
        if (scanOverlay) scanOverlay.classList.add('hidden');
    }

    function updateStatus(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
        
        if (generateBtn && (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING'))) {
            generateBtn.disabled = true;
            generateBtn.textContent = text;
        } else if (generateBtn && text === 'READY') {
            generateBtn.disabled = false;
            generateBtn.textContent = 'GENERATE MUGSHOT RECORD';
        } else if (generateBtn && text === 'COMPLETE') {
            generateBtn.textContent = 'GENERATE MUGSHOT RECORD';
            generateBtn.disabled = false;
        }
    }

    function showError(msg) {
        alert('Error: ' + msg);
        updateStatus('ERROR');
        hideLoading();
    }

    function showPreview(url) {
        const img = document.getElementById('preview-image');
        const placeholder = document.getElementById('upload-placeholder');
        
        if (img) {
            img.src = url;
            img.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (resetBtn) resetBtn.disabled = false;
    }

    function showResultMedia(url) {
        const resultFinal = document.getElementById('result-final');
        const resultPlaceholder = document.getElementById('result-placeholder');
        const resultContainer = document.getElementById('result-container');
        
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        
        // Check for video extension
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (isVideo) {
            if (resultFinal) resultFinal.classList.add('hidden');
            
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = resultFinal ? resultFinal.className : 'w-full h-auto rounded-lg shadow-lg';
                resultFinal.parentNode.insertBefore(video, resultFinal);
            }
            video.src = url;
            video.classList.remove('hidden');
        } else {
            const video = document.getElementById('result-video');
            if (video) video.classList.add('hidden');
            
            if (resultFinal) {
                resultFinal.src = url + '?t=' + new Date().getTime(); // Prevent caching
                resultFinal.classList.remove('hidden');
                // Remove the simulated filter from old script
                resultFinal.style.filter = 'none';
            }
        }
        
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.disabled = false;
        }
    }

    // -----------------------------------------
    // HANDLERS
    // -----------------------------------------

    // 1. File Selection Handler
    async function handleFileSelect(file) {
        if (!file) return;
        
        try {
            showLoading();
            updateStatus('UPLOADING...');
            
            // Upload immediately
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Show preview
            showPreview(uploadedUrl);
            
            updateStatus('READY');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error(error);
            showError(error.message);
        }
    }

    // 2. Generate Handler
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please upload an image first.');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Submit job
            const jobData = await submitImageGenJob(currentUploadedUrl);
            console.log('Job ID:', jobData.jobId);
            
            updateStatus('JOB QUEUED...');
            
            // Poll for result
            const result = await pollJobStatus(jobData.jobId);
            
            // Extract URL from response
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                console.error('Response:', result);
                throw new Error('No image URL in response');
            }
            
            console.log('Result URL:', resultUrl);
            
            // Show result
            showResultMedia(resultUrl);
            updateStatus('COMPLETE');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            console.error(error);
            showError(error.message);
        }
    }

    // -----------------------------------------
    // WIRING
    // -----------------------------------------

    // File Input Wiring
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary)';
            uploadZone.style.background = 'rgba(183, 65, 14, 0.1)';
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '';
            uploadZone.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
        });
        
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // Generate Button Wiring
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Reset Button Wiring
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            if (fileInput) fileInput.value = '';
            
            // Reset Preview
            const previewImage = document.getElementById('preview-image');
            const uploadPlaceholder = document.getElementById('upload-placeholder');
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
            }
            if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
            
            // Reset Result
            const resultFinal = document.getElementById('result-final');
            const resultVideo = document.getElementById('result-video');
            const resultPlaceholder = document.getElementById('result-placeholder');
            
            if (resultFinal) resultFinal.classList.add('hidden');
            if (resultVideo) resultVideo.classList.add('hidden');
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            
            // Reset Buttons
            generateBtn.textContent = 'GENERATE MUGSHOT RECORD';
            generateBtn.disabled = true;
            resetBtn.disabled = true;
            downloadBtn.disabled = true;
            
            hideLoading();
        });
    }

    // Download Button Wiring (Robust Strategy)
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.innerHTML;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            function downloadBlob(blob, filename) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
            }
            
            function getExtension(url, contentType) {
                if (contentType) {
                    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
                    if (contentType.includes('png')) return 'png';
                    if (contentType.includes('webp')) return 'webp';
                }
                const match = url.match(/\.(jpe?g|png|webp|mp4|webm)/i);
                return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
            }
            
            try {
                // STRATEGY 1: Proxy Download
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                
                const blob = await response.blob();
                const ext = getExtension(url, response.headers.get('content-type'));
                downloadBlob(blob, 'mugshot_' + generateNanoId(8) + '.' + ext);
                
            } catch (proxyErr) {
                console.warn('Proxy failed, trying direct fetch');
                
                try {
                    // STRATEGY 2: Direct Fetch
                    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                    const response = await fetch(fetchUrl, { mode: 'cors' });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const ext = getExtension(url, response.headers.get('content-type'));
                        downloadBlob(blob, 'mugshot_' + generateNanoId(8) + '.' + ext);
                    } else {
                        throw new Error('Direct fetch failed');
                    }
                } catch (fetchErr) {
                    alert('Download failed due to browser security restrictions. Please right-click the image and select "Save Image As".');
                }
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});