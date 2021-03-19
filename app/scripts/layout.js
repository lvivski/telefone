import { $, $$ } from './select.js'

const conference = $("#conference")
const cameras = $("#cameras")
const screen = $("#screen")

const screenObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
			conference.classList.add('presenting')
		} else if (mutation.removedNodes.length) {
			conference.classList.remove('presenting')
		}
  })
})
screenObserver.observe(screen, { childList: true })

const camerasObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length || mutation.removedNodes.length) {
			autoLayout()
		}
  })
})
camerasObserver.observe(cameras, { childList: true })


const resizeObserver = new ResizeObserver(() => debounce(autoLayout, 50))
resizeObserver.observe(conference)

function autoLayout() {
  const gallery = $('#cameras')
	if (gallery.parentNode.classList.contains('presenting')) return
	const container = gallery.parentNode
  const aspectRatio = 4 / 3
  const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect()
  const videoCount = $$('video', gallery).length || 1

  const { width, height, cols } = calculateConstraints(
    containerWidth,
    containerHeight,
    videoCount,
    aspectRatio
  )

  gallery.style.setProperty("--width", width + "px")
  gallery.style.setProperty("--height", height + "px")
  gallery.style.setProperty("--cols", cols)
}

function calculateConstraints(
	containerWidth,
	containerHeight,
	videoCount,
	aspectRatio,
) {
	let constraints = {
		area: 0,
		cols: 0,
		rows: 0,
		width: 0,
		height: 0
	}

	for (let cols = 1; cols <= videoCount; cols++) {
		const rows = Math.ceil(videoCount / cols)
		const horizontalScale = containerWidth / (cols * aspectRatio)
		const verticalScale = containerHeight / rows

		let width
		let height
		if (horizontalScale <= verticalScale) {
			width = Math.floor(containerWidth / cols)
			height = Math.floor(width / aspectRatio)
		} else {
			height = Math.floor(containerHeight / rows)
			width = Math.floor(height * aspectRatio)
		}

		const area = width * height
		if (area > constraints.area) {
			constraints = {
				area,
				width,
				height,
				rows,
				cols
			}
		}
	}

	return constraints
}

function debounce(func, wait) {
	let timeout
	return function(...args) {
		const context = this
		const later = function() {
			func.apply(context, args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}
