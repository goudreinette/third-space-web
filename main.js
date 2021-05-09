let capture;
let predictions = []
let score = 0

const WIDTH = 160
const HEIGHT = 120

let cameraGraphics
let cameraShader

let images = {}
let pressStart

let lightColor = 'rgb(217, 165, 179)'
let darkColor = 'rgb(198, 215, 235)'



function preload() {
    images.butt = loadImage('./img/butt.png')
    images.cook = loadImage('./img/cook.png')
    images.toilet = loadImage('./img/toliet.png')
    images.poop = loadImage('./img/poop.png')
    pressStart = loadFont('./fonts/prstart.ttf')

    cameraGraphics = createGraphics(WIDTH, HEIGHT, WEBGL);
    cameraShader = loadShader('shaders/basic.vert', 'shaders/colorize.frag');
}


/**
 * Do different things depending on the game/scene
 */
class SceneStart {
    onEnter() {

    }

    update() {
        for (const g of grabbers) {
            if (g.mouthOpen) {
                scene = new SceneToilet()
            }
        }

        // draw --
        drawCameraPixelated()

        // transparency
        background('hsla(0,0%,100%, .9)')
        fill('black')
        textAlign(CENTER)
        textSize(12)

        text("THIRD SPACE", WIDTH / 2, HEIGHT / 2)
        textSize(4)

        if (frameCount / 8 % 8 < 4)
            text("open mouth to play", WIDTH / 2, HEIGHT / 2 + 10)

        // and back
        translate(WIDTH, 0);
        scale(-1, 1);
    }
}

class SceneToilet {
    shits = []

    onEnter() {

    }

    update() {
        drawCameraPixelated()

        // Draw/update all shits
        for (const s of this.shits) {
            s.y += 1

            if (s.y > HEIGHT) {
                this.shits = this.shits.filter(ss => ss != s)
            }

            if (distance(s.x, s.y, grabbers[1].x, grabbers[1].y) < s.r) {
                score++
                this.shits = this.shits.filter(ss => ss != s)
            }

            image(images.poop, s.x, s.y, s.r, s.r)
        }

        // Top 
        if (grabbers[0]) {
            let buttX = grabbers[0].x - 24
            let buttY = grabbers[0].y - 20

            image(images.butt, buttX, buttY, 50, 50)

            if (grabbers[0].mouthOpen & frameCount % 5 == 0) {
                this.shits.push({
                    x: grabbers[0].x - 10,
                    y: grabbers[0].y,
                    r: 20
                })
            }
        }

        if (grabbers[1]) {
            image(images.toilet, grabbers[1].x - 24, grabbers[1].y - 20, 50, 50)
        }

        drawScore()
        // Bottom
        // image(images.butt, grabbers[0].x - 24, grabbers[0].y - 20, 50, 50)
    }
}

class SceneDelivery {
    onEnter() {

    }

    update() {
        drawCameraPixelated()

        for (const g of grabbers) {
            g.draw()
        }

        for (const o of objectsToGrab) {
            fill('red')
            ellipse(o.x, o.y, o.r)
        }

        for (const d of dropZones) {
            d.update()
            d.draw()
        }

        // Draw hat
        if (predictions[0]) {
            const [x, y, z] = predictions[0].annotations.midwayBetweenEyes[0]
            image(images.poop, x, y, 40, 40)
        }
    }
}

class SceneFinished {
    onEnter() {

    }

    update() {
        // draw --
        drawCameraPixelated()

        // transparency
        background('hsla(0,0%,100%, .9)')
        fill('black')
        resetMatrix(); // reset
        textAlign(CENTER)
        textSize(12)

        text("FINISHED", WIDTH / 2, HEIGHT / 2)
        textSize(5)

        // and back
        translate(WIDTH, 0);
        scale(-1, 1);
    }
}


let scene = new SceneToilet()


class MouthParticle {
    r = 0

    constructor(x, y, grabber) {
        this.x = x
        this.y = y
        this.grabber = grabber
    }

    update() {
        this.r++
    }

    draw() {
        stroke('red')
        noFill()
        ellipse(this.x, this.y, this.r)
    }
}

class DropZone {
    constructor(x, y, r) {
        this.x = x
        this.y = y
        this.r = r
    }

    update() {
        for (const o of objectsToGrab) {
            if (distance(this.x, this.y, o.x, o.y) < this.r / 2) {
                objectsToGrab = objectsToGrab.filter(oo => oo != o)
                score += 1

                // Spawn a new one
                objectsToGrab.push({
                    x: random(WIDTH),
                    y: random(HEIGHT),
                    r: 10
                })
            }
        }
    }

    draw() {
        fill('white')
        noStroke()
        ellipse(this.x, this.y, this.r)
    }
}


class Grabber {
    x = 0
    y = 0

    mouthOpen = false // boolean
    dragging = null // A SceneObject
    inRange = null // A SceneObject
    justReleased = null // A SceneObject
    justOpened = false
    justClosed = false
    mouthParticles = []

    update(prediction) {
        const {
            lipsLowerInner,
            lipsUpperInner
        } = prediction.annotations

        // Calculate positions
        const lipsLowerInnerCoords = lipsLowerInner[5]
        const lipsUpperInnerCoords = lipsUpperInner[5]
        const lowerLipsY = lipsLowerInnerCoords[1] / 2
        const upperLipsY = lipsUpperInnerCoords[1] / 2

        const mouthX = this.x = lipsLowerInnerCoords[0] / 2
        const mouthY = this.y = (lowerLipsY + upperLipsY) / 2
        const mouthZ = lipsLowerInnerCoords[2] / 2

        // Update 
        this.justClosed = false
        this.justOpened = false

        const difference = lipsLowerInner[5][1] - lipsUpperInner[5][1]

        let lastMouthOpen = this.mouthOpen
        this.mouthOpen = difference > 10

        if (lastMouthOpen && !this.mouthOpen) {
            this.justClosed = true
            this.justOpened = false
        } else if (!lastMouthOpen && this.mouthOpen) {
            this.justOpened = true
            this.justClosed = false
        }

        let anyInRange = false

        for (const o of objectsToGrab) {
            if (distance(mouthX, lowerLipsY, o.x, o.y) < o.r / 2) {
                this.inRange = o
                anyInRange = true

                if (this.justClosed && this.mouthOpen == false) {
                    this.dragging = o
                }
            }

            if (this.dragging == o) {
                o.x = lerp(mouthX, o.x, 0.25)
                o.y = lerp(lowerLipsY, o.y, 0.25)
            }
        }

        if (this.mouthOpen) {
            this.dragging = null

            if (frameCount % 5 == 0) {
                this.mouthParticles.push(new MouthParticle(mouthX, mouthY))
            }
        }

        for (const particle of this.mouthParticles) {
            particle.update()
            if (particle.r > 20) {
                this.mouthParticles = this.mouthParticles.filter(p => p != particle)
            }
        }

        if (!anyInRange) {
            this.inRange = null
        }
    }

    draw() {
        // Draw
        for (const particle of this.mouthParticles) {
            particle.draw()
        }

    }
}

let grabbers = [
    new Grabber(),
    new Grabber(),
    new Grabber(),
    new Grabber(),
    new Grabber(),
    new Grabber(),
    new Grabber()
]


let objectsToGrab = [
    {
        x: 50,
        y: 50,
        r: 10
    },
    {
        x: 30,
        y: 30,
        r: 10
    }
]


let dropZones = [
    new DropZone(80, 80, 10)
]



/**
 * Main
 */
function setup() {
    createCanvas(WIDTH, HEIGHT);

    // Init video
    capture = createVideo(['vid2.mp4']);
    capture.loop()
    capture.hide();



    setupFaceDetection()


    textFont(pressStart)
}


async function setupFaceDetection() {
    const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages
        .mediapipeFacemesh, {
        maxFaces: 4,
        shouldLoadIrisModel: false
    });

    setInterval(async () => {
        predictions = await model.estimateFaces({
            input: capture.elt,
            predictIrises: false
        });
    }, 32)
}


function updateFaces() {
    // Sort predictions // FIXME
    predictions.sort((a, b) => {
        return a.boundingBox.topLeft[1] - b.boundingBox.topLeft[1]
    })

    for (let i = 0; i < predictions.length; i++) {
        const prediction = predictions[i];
        const grabber = grabbers[i];
        grabber.update(prediction)
    }
}




function drawCameraPixelated() {
    background('white')
    cameraGraphics.shader(cameraShader)

    cameraShader.setUniform('tex0', capture);

    // also send the mouseX value but convert it to a number between 0 and 1
    // cameraShader.setUniform('mouseX', mouseX / width);
    // cameraGraphics.
    cameraGraphics.rect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT);

    scale(-1, 1);
    translate(-WIDTH, 0);
    image(cameraGraphics, 0, 0, WIDTH, HEIGHT);

    resetMatrix(); // reset
}

function drawScore() {
    translate(WIDTH, 0);
    scale(-1, 1);

    textSize(8)
    fill('red')
    text(`${score}`, WIDTH - grabbers[1].x, grabbers[1].y)

    resetMatrix()

}


function draw() {
    /**
    * Always track the faces
    */
    updateFaces()

    /**
     * Do different things depending on the scene
     */
    scene.update()
}


function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}