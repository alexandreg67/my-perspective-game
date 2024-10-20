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

  const nbColumns = 5; // Nombre de colonnes dans la grille

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
          const shipCenterX = (shipPosition + 0.5) * spacingX;
          const shipY = height - 100;

          // Dessiner un triangle pour représenter le vaisseau
          context.beginPath();
          context.moveTo(shipCenterX, shipY);
          context.lineTo(shipCenterX - 20, shipY + 40);
          context.lineTo(shipCenterX + 20, shipY + 40);
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      setShipPosition((prevPos) => Math.max(prevPos - 1, 0)); // Aller à gauche dans la grille
    } else if (event.key === "ArrowRight") {
      setShipPosition((prevPos) => Math.min(prevPos + 1, nbColumns - 1)); // Aller à droite dans la grille
    }
  };

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </div>
  );
};

export default Game;
