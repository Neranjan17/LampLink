// animation-utils.js

// Section transition animations
function animateSectionTransition(fromSection, toSection) {
    // Hide the from section with a fade out
    fromSection.style.opacity = "1";
    fromSection.style.transition = "opacity 0.5s ease";
    
    setTimeout(() => {
      fromSection.style.opacity = "0";
      
      setTimeout(() => {
        fromSection.style.display = "none";
        
        // Show the to section with a fade in
        toSection.style.display = "flex";
        toSection.style.opacity = "0";
        
        // Force a reflow to ensure the transition applies
        void toSection.offsetWidth;
        
        toSection.style.transition = "opacity 0.5s ease";
        toSection.style.opacity = "1";
        
        // Scroll to the section
        toSection.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }, 50);
  }
  
  // Overlay animation for start panel
  function animateOverlayTransition(overlay, isShowing) {
    overlay.style.transition = "opacity 0.6s ease, transform 0.5s ease";
    
    if (isShowing) {
      overlay.style.display = "flex";
      overlay.style.opacity = "0";
      overlay.style.transform = "translateY(20px)";
      
      // Force a reflow to ensure the transition applies
      void overlay.offsetWidth;
      
      overlay.style.opacity = "1";
      overlay.style.transform = "translateY(0)";
    } else {
      overlay.style.opacity = "1";
      overlay.style.transform = "translateY(0)";
      
      setTimeout(() => {
        overlay.style.opacity = "0";
        overlay.style.transform = "translateY(-20px)";
        
        setTimeout(() => {
          overlay.style.display = "none";
        }, 600);
      }, 50);
    }
  }
  
  // Preload images function
  function preloadImages(urls, onProgress, onComplete) {
    let loadedCount = 0;
    const totalImages = urls.length;
    
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
      
      img.onload = () => {
        loadedCount++;
        const progress = (loadedCount / totalImages) * 100;
        if (onProgress) onProgress(progress);
        
        if (loadedCount === totalImages && onComplete) {
          onComplete();
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        console.error(`Failed to load image: ${url}`);
        
        if (loadedCount === totalImages && onComplete) {
          onComplete();
        }
      };
    });
  }
  
  // Create a loading animation for buttons
  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      const originalText = button.innerText;
      button.setAttribute('data-original-text', originalText);
      button.disabled = true;
      button.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Loading...</span>
      `;
    } else {
      const originalText = button.getAttribute('data-original-text') || "Button";
      button.disabled = false;
      button.innerText = originalText;
    }
  }
  
  // Export functions
  export {
    animateSectionTransition,
    animateOverlayTransition,
    preloadImages,
    setButtonLoading
  };