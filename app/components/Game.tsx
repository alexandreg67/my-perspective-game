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
  // Calculer la distance par rapport au point de fuite
  const linY = y / height; // On avance vers le bas de l'écran
  const factorY = Math.pow(linY, 3); // Facteur de profondeur ajusté

  const diffX = x - perspectivePointX; // Différence horizontale par rapport au centre
  const offsetX = diffX * factorY; // Réduire la largeur en fonction de la profondeur

  const trX = perspectivePointX + offsetX; // Appliquer la transformation horizontale
  const trY = perspectivePointY + factorY * (height - perspectivePointY); // Appliquer la transformation verticale
  return [trX, trY]; // Retourner les nouvelles coordonnées
};

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [currentOffsetY, setCurrentOffsetY] = useState(0);
  const [currentSpeedX, setCurrentSpeedX] = useState(0);

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
        const { width, height } = context.canvas;
        context.clearRect(0, 0, width, height);

        // Le point de fuite légèrement en haut, mais au-dessus de la ligne horizontale la plus large
        const perspectivePointX = width / 2;
        const perspectivePointY = height * 0.2; // Le point de fuite est légèrement en haut

        const lineColor = "white";

        // Dessiner les lignes verticales
        const vNbLines = 10;
        const vLineSpacing = 0.25; // Pourcentage de la largeur de l'écran
        const centralLineX = width / 2;
        const spacingX = vLineSpacing * width;
        let offsetX = -Math.floor(vNbLines / 2) + 0.5;
        context.beginPath();
        context.strokeStyle = lineColor;

        for (let i = 0; i < vNbLines; i++) {
          const lineX = centralLineX + offsetX * spacingX + currentSpeedX;
          const [x1, y1] = transformPerspective(
            lineX,
            height, // L'endroit où la ligne est la plus large (sol, en bas)
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [x2, y2] = transformPerspective(
            lineX,
            0, // Converge vers le point de fuite en haut
            perspectivePointX,
            perspectivePointY,
            height
          );
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          offsetX += 1;
        }
        context.stroke();

        // Dessiner les lignes horizontales
        const hNbLines = 8;
        const hLineSpacing = 0.15; // Pourcentage de la hauteur de l'écran
        const spacingY = hLineSpacing * height;
        offsetX = -Math.floor(vNbLines / 2) + 0.5;
        const xmin = centralLineX + offsetX * spacingX + currentSpeedX;
        const xmax = centralLineX - offsetX * spacingX + currentSpeedX;
        context.beginPath();
        context.strokeStyle = lineColor;

        for (let i = 0; i < hNbLines; i++) {
          const lineY = height - i * spacingY + currentOffsetY; // Le bas pour donner l'impression de progression
          const [x1, y1] = transformPerspective(
            xmin,
            lineY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          const [x2, y2] = transformPerspective(
            xmax,
            lineY,
            perspectivePointX,
            perspectivePointY,
            height
          );
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
        }
        context.stroke();
      }
    };

    const animationFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameId);
  }, [context, currentOffsetY, currentSpeedX]);

  useEffect(() => {
    const update = () => {
      setCurrentOffsetY((prevOffsetY) => {
        let newOffsetY = prevOffsetY + 6; // Vitesse de défilement vertical
        const spacingY = context ? 0.15 * context.canvas.height : 0; // Espacement vertical des lignes
        if (newOffsetY >= spacingY) {
          newOffsetY -= spacingY;
        }
        return newOffsetY;
      });
    };

    const intervalId = setInterval(update, 1000 / 60); // Mettre à jour 60 fois par seconde
    return () => clearInterval(intervalId);
  }, [context]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      setCurrentSpeedX(12); // Vitesse de déplacement horizontal vers la gauche
    } else if (event.key === "ArrowRight") {
      setCurrentSpeedX(-12); // Vitesse de déplacement horizontal vers la droite
    }
  };

  const handleKeyUp = () => {
    setCurrentSpeedX(0);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touchX = event.touches[0].clientX;
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = touchX - rect.left;
      if (canvasX < canvas.width / 2) {
        setCurrentSpeedX(12);
      } else {
        setCurrentSpeedX(-12);
      }
    }
  };

  const handleTouchEnd = () => {
    setCurrentSpeedX(0);
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0} // Permet au div de recevoir le focus pour les événements clavier
    >
      <canvas ref={canvasRef} width={900} height={400} />
    </div>
  );
};

export default Game;
