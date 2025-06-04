// Drag and Drop Functionality
const uploadBox = document.querySelector(".upload-box")
const uploadText = document.querySelector(".upload-text")
const fileInput = document.querySelector(".file-input")
const loadingOverlay = document.getElementById("loadingOverlay")
const uploadSection = document.querySelector(".upload-section")

// Cards functionality
const cards = document.querySelectorAll(".card")

// Track file state
let filesLoaded = false

// Initialize cards as disabled
function initializeCards() {
  cards.forEach((card) => {
    card.classList.add("disabled")
  })
}

// Enable/Disable cards based on file state
function toggleCardsState(enabled) {
  cards.forEach((card) => {
    if (enabled) {
      card.classList.remove("disabled")
    } else {
      card.classList.add("disabled")
      card.classList.remove("active")
    }
  })
  filesLoaded = enabled
}

// Drag and Drop Events
uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault()
  uploadBox.classList.add("hover")
})

uploadBox.addEventListener("dragleave", (e) => {
  e.preventDefault()
  uploadBox.classList.remove("hover")
})

uploadBox.addEventListener("drop", (e) => {
  e.preventDefault()
  uploadBox.classList.remove("hover")

  const files = e.dataTransfer.files
  if (files.length) {
    fileInput.files = files
    updateUploadText(files.length)
    toggleCardsState(true)
  } else {
    uploadText.textContent = "Ningún archivo válido"
    toggleCardsState(false)
  }
})

uploadBox.addEventListener("click", () => fileInput.click())

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    updateUploadText(fileInput.files.length)
    toggleCardsState(true)
  } else {
    toggleCardsState(false)
  }
})

function updateUploadText(fileCount) {
  uploadText.innerHTML = `
    <strong>${fileCount} archivo(s) cargado(s)</strong>
    <br><small>Listo para procesar</small>
  `
}

// Card Interactions
cards.forEach((card) => {
  const actionBtn = card.querySelector(".card-action-btn")
  const cardType = card.dataset.type

  // Card click to select
  card.addEventListener("click", (e) => {
    // Prevent interaction if disabled
    if (card.classList.contains("disabled")) {
      highlightUploadSection()
      return
    }

    if (e.target === actionBtn) return // Don't trigger if clicking action button

    // Remove active class from all cards
    cards.forEach((c) => c.classList.remove("active"))

    // Add active class to clicked card
    card.classList.add("active")
  })

  // Action button click
  if (actionBtn) {
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation()

      // Double check files are loaded
      if (!filesLoaded || !fileInput.files.length) {
        highlightUploadSection()
        return
      }

      processCard(cardType, card)
    })
  }

  // Hover effects (only for enabled cards)
  card.addEventListener("mouseenter", () => {
    if (!card.classList.contains("disabled") && !card.classList.contains("active")) {
      card.style.transform = "translateY(-10px) scale(1.02)"
    }
  })

  card.addEventListener("mouseleave", () => {
    if (!card.classList.contains("disabled") && !card.classList.contains("active")) {
      card.style.transform = ""
    }
  })
})

function highlightUploadSection() {
  uploadSection.classList.add("highlight")

  // Show a temporary message
  showInfoMessage("Por favor, sube un archivo primero para activar las funciones")

  setTimeout(() => {
    uploadSection.classList.remove("highlight")
  }, 2000)
}

function updateUsageCount(card) {
  const usageElement = card.querySelector(".usage-count")
  const currentCount = Number.parseInt(usageElement.textContent.match(/\d+/)[0])
  const newCount = currentCount + 1
  usageElement.textContent = `Usado ${newCount} veces`

  // Add success animation
  card.classList.add("success")
  setTimeout(() => {
    card.classList.remove("success")
  }, 600)
}

function processCard(type, cardElement) {
  // Final check for files
  if (!fileInput.files.length) {
    highlightUploadSection()
    return
  }

  // Show loading overlay
  loadingOverlay.classList.add("show")

  // Simulate processing time
  setTimeout(
    () => {
      loadingOverlay.classList.remove("show")

      // Show success message
      showSuccessMessage(type)

      // Update card stats
      updateUsageCount(cardElement)
    },
    2000 + Math.random() * 2000,
  ) // Random processing time between 2-4 seconds
}

function showSuccessMessage(type) {
  const messages = {
    "verdadero-falso": "¡Preguntas de Verdadero/Falso generadas exitosamente!",
    resumen: "¡Resumen creado exitosamente!",
    "multiple-choice": "¡Examen de opción múltiple generado exitosamente!",
  }

  showNotification(messages[type], "success")
}

function showInfoMessage(message) {
  showNotification(message, "info")
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div")
  notification.className = `notification ${type}`

  const icon = type === "success" ? "✅" : "ℹ️"
  const bgColor =
    type === "success" ? "linear-gradient(135deg, #00b894, #00a085)" : "linear-gradient(135deg, #0984e3, #74b9ff)"

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">${message}</div>
    </div>
  `

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `

  document.body.appendChild(notification)

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 4000)
}

// Keyboard shortcuts (only work when files are loaded)
document.addEventListener("keydown", (e) => {
  if (!filesLoaded) return

  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "1":
        e.preventDefault()
        cards[0].click()
        break
      case "2":
        e.preventDefault()
        cards[1].click()
        break
      case "3":
        e.preventDefault()
        cards[2].click()
        break
      case "u":
        e.preventDefault()
        fileInput.click()
        break
    }
  }
})

// Add tooltips for keyboard shortcuts
cards.forEach((card, index) => {
  card.title = `Ctrl+${index + 1} para seleccionar (requiere archivo)`
})

uploadBox.title = "Ctrl+U para subir archivos"

// Initialize on page load
initializeCards()
