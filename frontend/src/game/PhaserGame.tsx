import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';

export function PhaserGame() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const game = new Phaser.Game({
            type: Phaser.AUTO,
            parent: containerRef.current!,
            width: 800,
            height: 600,
            backgroundColor: '#1d2330',
            pixelArt: true,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            scene: [GameScene],
        });

        // Bắt buộc: StrictMode mount 2 lần, không destroy sẽ có 2 game chồng nhau
        return () => {
            game.destroy(true);
        };
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}