
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

            if (distance(s.x, s.y, players[1].x, players[1].y) < s.r) {
                score++
                this.shits = this.shits.filter(ss => ss != s)
            }

            image(images.poop, s.x, s.y, s.r, s.r)
        }

        // Top 
        if (players[0].present) {
            let buttX = players[0].x - 24
            let buttY = players[0].y - 20

            image(images.butt, buttX, buttY, 50, 50)

            if (players[0].mouthOpen & frameCount % 5 == 0) {
                this.shits.push({
                    x: players[0].x - 10,
                    y: players[0].y,
                    r: 20
                })
            }
        }

        if (players[1].present) {
            let buttX = players[1].x - 24
            let buttY = players[1].y - 20

            image(images.butt, buttX, buttY, 50, 50)

            if (players[1].mouthOpen & frameCount % 5 == 0) {
                this.shits.push({
                    x: players[1].x - 10,
                    y: players[1].y,
                    r: 20
                })
            }
        }

        if (players[2].present) {
            image(images.toilet, players[2].x - 24, players[2].y - 20, 50, 50)
        }

        if (players[3].present) {
            image(images.toilet, players[3].x - 24, players[3].y - 20, 50, 50)
        }

        drawScore()
        // Bottom
        // image(images.butt, players[0].x - 24, players[0].y - 20, 50, 50)
    }
}