"use client";

import React, { useEffect, useRef, useState } from "react";

// Fonction pour transformer la perspective correctement
const transformPerspective = (
  x: number,
  y: number,
  perspectivePointX: number,
  perspectivePointY: number,
  height: number
): [number, number] => {
  const linY = y / height; // On avance vers le bas de l'écran
  const factorY = Math.pow(linY, 3); // Facteur de profondeur ajusté

  const diffX = x - perspectivePointX; // Différence horizontale par rapport au centre
  const offsetX = diffX * factorY; // Réduire la largeur en fonction de la profondeur

  const trX = perspectivePointX + offsetX; // Appliquer la transformation horizontale
  const trY = perspectivePointY + factorY * (height - perspectivePointY); // Appliquer la transformation verticale
  return [trX, trY]; // Retourner les nouvelles coordonnées
};

interface GameProps {
  showShip: boolean; // Indiquer si le vaisseau doit être affiché
}

const Game: React.FC<GameProps> = ({ showShip }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 400 });
  const [shipPosition, setShipPosition] = useState(2); // Position du vaisseau sur la grille
  const [currentOffsetY, setCurrentOffsetY] = useState(0);

  const nbColumns = 7; // Nombre de colonnes dans la grille

  useEffect(() => {
    const updateCanvasSize = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        const width = parent.clientWidth;
        const height = parent.clientHeight;
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        setContext(ctx);
      }
    }
  }, []);

  useEffect(() => {
    const draw = () => {
      if (context) {
        const { width, height } = canvasSize;
        context.clearRect(0, 0, width, height);

        const perspectivePointX = width / 2;
        const perspectivePointY = height * 0.2;

        const lineColor = "white";

        // Dessiner les lignes verticales (grille)
        const spacingX = width / nbColumns; // Largeur d'une colonne
        context.beginPath();
        context.strokeStyle = lineColor;

        for (let i = 0; i <= nbColumns; i++) {
          const lineX = i * spacingX;
          const [x1, y1] = transformPerspective(
            lineX,
            height,
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [x2, y2] = transformPerspective(
            lineX,
            0,
            perspectivePointX,
            perspectivePointY,
            height
          );
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
        }
        context.stroke();

        // Dessiner les lignes horizontales
        const hNbLines = 8;
        const hLineSpacing = 0.15;
        const spacingY = hLineSpacing * height;
        context.beginPath();
        context.strokeStyle = lineColor;

        for (let i = 0; i < hNbLines; i++) {
          const lineY = height - i * spacingY + currentOffsetY;
          const [x1, y1] = transformPerspective(
            0,
            lineY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [x2, y2] = transformPerspective(
            width,
            lineY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
        }
        context.stroke();

        // Dessiner le vaisseau si `showShip` est vrai
        if (showShip) {
          // Placer le vaisseau encore plus proche de l'avant (plus en bas)
          const shipBottomY = height - 0; // Placer le bas du vaisseau plus proche du bas
          const shipTopY = height - 50; // Placer le haut légèrement au-dessus du bas

          // Calculer les coordonnées en perspective pour le vaisseau
          const shipLeftX = (shipPosition + 0) * spacingX; // Côté gauche de la case du vaisseau
          const shipRightX = (shipPosition + 1) * spacingX; // Côté droit de la case du vaisseau

          // Transformation en perspective pour le haut et le bas du vaisseau
          const [leftX1, bottomY1] = transformPerspective(
            shipLeftX,
            shipBottomY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [rightX1, bottomY2] = transformPerspective(
            shipRightX,
            shipBottomY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [topX, topY] = transformPerspective(
            (shipLeftX + shipRightX) / 2, // Milieu pour le sommet du triangle
            shipTopY,
            perspectivePointX,
            perspectivePointY,
            height
          );

          // Dessiner le vaisseau déformé en perspective
          context.beginPath();
          context.moveTo(topX, topY); // Sommet du triangle (vaisseau)
          context.lineTo(leftX1, bottomY1); // Bas gauche
          context.lineTo(rightX1, bottomY2); // Bas droit
          context.closePath();
          context.fillStyle = "white";
          context.fill();
        }
      }
    };

    const animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [context, canvasSize, shipPosition, currentOffsetY, showShip]);

  useEffect(() => {
    const update = () => {
      setCurrentOffsetY((prevOffsetY) => {
        let newOffsetY = prevOffsetY + 6;
        const spacingY = 0.15 * canvasSize.height;
        if (newOffsetY >= spacingY) {
          newOffsetY -= spacingY;
        }
        return newOffsetY;
      });
    };

    const intervalId = setInterval(update, 1000 / 60);
    return () => clearInterval(intervalId);
  }, [canvasSize.height]);

  // Gestion des événements clavier pour déplacer le vaisseau
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setShipPosition((prevPos) => Math.max(prevPos - 1, 0)); // Aller à gauche dans la grille
      } else if (event.key === "ArrowRight") {
        setShipPosition((prevPos) => Math.min(prevPos + 1, nbColumns - 1)); // Aller à droite dans la grille
      }
    };

    window.addEventListener("keydown", handleKeyDown); // Écouter les événements clavier

    return () => window.removeEventListener("keydown", handleKeyDown); // Nettoyer l'événement
  }, []);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </div>
  );
};

export default Game;
