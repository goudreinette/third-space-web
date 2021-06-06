let capture;
let predictions = []
let model
let stream
let params = new URLSearchParams(location.search)

let score = 0

const WIDTH = 320
const HEIGHT = 180
const MIDDLE_Y = HEIGHT / 2
const MIDDLE_X = WIDTH / 2

let cameraGraphics
let cameraShader

let images = {}
let pressStart


function preload() {
    images.butt = loadImage('./img/butt.png')
    images.cook = loadImage('./img/cook.png')
    images.customer = loadImage('./img/customer.png')
    images.coin = loadImage('./img/coin.png')
    images.hand = loadImage('./img/hand.png')
    images.toilet = loadImage('./img/toliet.png')
    images.poop = loadImage('./img/poop.png')
    images.pizza = loadImage('./img/pizza.png')
    pressStart = loadFont('./fonts/prstart.ttf')

    cameraGraphics = createGraphics(WIDTH, HEIGHT, WEBGL);
    cameraShader = loadShader('shaders/basic.vert', 'shaders/colorize.frag');
}


/**
 * Do different things depending on the game/scene
 */
let scene

if (!params.has('scene')) {
    scene = new SceneStart()
}

if (params.get('scene') == "toilet") {
    scene = new SceneToilet()
}

if (params.get('scene') == "delivery") {
    scene = new SceneDelivery()
} 
 


class MouthParticle {
    r = 0

    constructor(x, y, player) {
        this.x = x
        this.y = y
        this.player = player
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


class Player {
    x = 0
    y = 0

    foreheadX = 0
    foreheadY = 0

    mouthOpen = false // boolean
    dragging = null // A SceneObject
    inRange = null // A SceneObject
    justReleased = null // A SceneObject
    justOpened = false
    justClosed = false
    mouthParticles = []
    present = true

    update(prediction) {
        const {
            lipsLowerInner,
            lipsUpperInner
        } = prediction.annotations

        // Calculate positions
        const lipsLowerInnerCoords = lipsLowerInner[5]
        const lipsUpperInnerCoords = lipsUpperInner[5]
        const lowerLipsY = lipsLowerInnerCoords[1]
        const upperLipsY = lipsUpperInnerCoords[1]
        this.x = lipsLowerInnerCoords[0]
        this.y = (lowerLipsY + upperLipsY) / 2 // average of mouth
        const mouthZ = lipsLowerInnerCoords[2] / 2

        
        
        this.foreheadX = (prediction.boundingBox.topLeft[0] + prediction.boundingBox.bottomRight[0])/2
        this.foreheadY =  prediction.boundingBox.topLeft[1]


        this.chinX = (prediction.boundingBox.topLeft[0] + prediction.boundingBox.bottomRight[0])/2
        this.chinY =  prediction.boundingBox.bottomRight[1]


        /**
         * Calculating mouth open state
         */
        this.justClosed = false
        this.justOpened = false

        const mouthOpenDistance = lipsLowerInner[5][1] - lipsUpperInner[5][1]

        let lastMouthOpen = this.mouthOpen
        this.mouthOpen = mouthOpenDistance > 2

        if (this.justReleased) {
            this.justReleased = null
        }

        if (lastMouthOpen && !this.mouthOpen) {
            this.justClosed = true
            this.justOpened = false
        } else if (!lastMouthOpen && this.mouthOpen) {
            this.justOpened = true
            this.justClosed = false
            this.justReleased = this.dragging
        }
    }

    draw() {
        for (const particle of this.mouthParticles) {
            particle.draw()
        }
    }
}

let players = [
    new Player(),
    new Player(),
]


let objectsToGrab = [
]


let dropZones = [
    // new DropZone(80, 80, 10)
]



/**
 * Main
 */
function setup() {
    createCanvas(WIDTH, HEIGHT);
    // pixelDensity(1)

    // Init video
    // capture = createVideo(['Untitled Project 2.mov']);
    // capture.loop()
    // video.size(WIDTH, HEIGHT)

    capture = createCapture(VIDEO);

    capture.hide();

    setupFaceDetection()


    textFont(pressStart)


    objectsToGrab = [
        {
            x: MIDDLE_X + 30,
            y: 90,
            r: 30,
            image: images.coin
        },
        {
            x: 30,
            y: 90,
            r: 30,
            image: images.pizza
        }
    ]
}


async function setupFaceDetection() {
    model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages
        .mediapipeFacemesh, {
        maxFaces: 2,
        shouldLoadIrisModel: false
    });

    setInterval(updateFaces, 32)
}


async function updateFaces() {
    predictions = await model.estimateFaces({
        input: capture.elt,
        predictIrises: false
    });

    predictions = predictions.sort((a, b) => {
        return a.boundingBox.topLeft[1] - b.boundingBox.topLeft[1]
    })

    if (predictions.length == 2) {
        // let prediction0 = predictions.find(p => (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)
        // let prediction1 = predictions.find(p => (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)
        let prediction0 = predictions.find(p => (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 < MIDDLE_X)
        let prediction1 = predictions.find(p => (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 > MIDDLE_X)

        if (prediction0) {
            players[0].present = true
            players[0].update(prediction0)
        } else {
            players[0].present = false
        }

        if (prediction1) {
            players[1].present = true
            players[1].update(prediction1)
        } else {
            players[1].present = false
        }
    }

    /**
     * Figuring out who is who / quarter split
     */
    // if (predictions.length == 4) {
    //     let prediction0 = predictions.find(p =>
    //         (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 < MIDDLE_X &&
    //         (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)

    //     let prediction1 = predictions.find(p =>
    //         (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 > MIDDLE_X &&
    //         (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 < MIDDLE_Y)

    //     let prediction2 = predictions.find(p =>
    //         (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 < MIDDLE_X &&
    //         (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)

    //     let prediction3 = predictions.find(p =>
    //         (p.boundingBox.topLeft[0] + p.boundingBox.bottomRight[0]) / 2 > MIDDLE_X &&
    //         (p.boundingBox.topLeft[1] + p.boundingBox.bottomRight[1]) / 2 > MIDDLE_Y)

    //     if (prediction0) {
    //         players[0].present = true
    //         players[0].update(prediction0)
    //     } else {
    //         players[0].present = false
    //     }

    //     if (prediction1) {
    //         players[1].present = true
    //         players[1].update(prediction1)
    //     } else {
    //         players[1].present = false
    //     }

    //     if (prediction2) {
    //         players[2].present = true
    //         players[2].update(prediction2)
    //     } else {
    //         players[2].present = false
    //     }

    //     if (prediction3) {
    //         players[3].present = true
    //         players[3].update(prediction3)
    //     } else {
    //         players[3].present = false
    //     }
    // }
}




function drawCameraPixelated() {
    background('white')
    cameraGraphics.shader(cameraShader)
    cameraShader.setUniform('tex0', capture);
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
    text(`${score}`, WIDTH - players[1].x, players[1].y)

    resetMatrix()
}


function drawFaceDebug() {
    stroke('rgba(255,0,0,0.2)')
    noFill()
    strokeWeight(1)

    // Split lines
    // line(0, HEIGHT / 2, WIDTH, HEIGHT / 2)
    // line(MIDDLE_X, 0, MIDDLE_X, HEIGHT)

    for (const p of predictions) {
        const { topLeft, bottomRight } = p.boundingBox
        const faceMiddleY = (topLeft[1] + bottomRight[1]) / 2
        const faceMiddleX = (topLeft[0] + bottomRight[0]) / 2

        rect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1])
        line(topLeft[0], faceMiddleY, bottomRight[0], faceMiddleY)
        line(faceMiddleX, topLeft[1], faceMiddleX, bottomRight[1])
    }
}


function draw() {
    /**
    * Always track the faces
    */

    /**
     * Do different things depending on the scene
     */
    scene.update()

    drawFaceDebug()
}


function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}