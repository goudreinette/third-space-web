class SceneStart {
    onEnter() {

    }

    update() {
        for (const g of players) {
            if (g.mouthOpen) {
                scene = new SceneDelivery()
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

    }
}