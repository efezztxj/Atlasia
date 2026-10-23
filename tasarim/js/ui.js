/* Atlasia UI Kiti — sunum davranışı
   - lucide ikonlarını (ISC) satır içi SVG olarak basar
   - durum çubuğu, ses dalgası gibi tekrar eden parçaları üretir
   - ekran ölçekleme, tema, klavye ve gezinme
   - galeri sayfasında canlı iframe önizlemelerini ölçekler
*/
(() => {
  "use strict";

  const ICONS = {"compass":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\" />","search":"<path d=\"m21 21-4.34-4.34\" /><circle cx=\"11\" cy=\"11\" r=\"8\" />","bell":"<path d=\"M10.268 21a2 2 0 0 0 3.464 0\" /><path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\" />","menu":"<path d=\"M4 5h16\" /><path d=\"M4 12h16\" /><path d=\"M4 19h16\" />","x":"<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />","plus":"<path d=\"M5 12h14\" /><path d=\"M12 5v14\" />","minus":"<path d=\"M5 12h14\" />","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /><path d=\"M16 3.128a4 4 0 0 1 0 7.744\" /><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /><circle cx=\"9\" cy=\"7\" r=\"4\" />","user-round":"<circle cx=\"12\" cy=\"8\" r=\"5\" /><path d=\"M20 21a8 8 0 0 0-16 0\" />","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /><circle cx=\"12\" cy=\"10\" r=\"3\" />","map":"<path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\" /><path d=\"M15 5.764v15\" /><path d=\"M9 3.236v15\" />","route":"<circle cx=\"6\" cy=\"19\" r=\"3\" /><path d=\"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15\" /><circle cx=\"18\" cy=\"5\" r=\"3\" />","headphones":"<path d=\"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3\" />","sparkles":"<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /><path d=\"M20 2v4\" /><path d=\"M22 4h-4\" /><circle cx=\"4\" cy=\"20\" r=\"2\" />","arrow-right":"<path d=\"M5 12h14\" /><path d=\"m12 5 7 7-7 7\" />","arrow-up-right":"<path d=\"M7 7h10v10\" /><path d=\"M7 17 17 7\" />","chevron-right":"<path d=\"m9 18 6-6-6-6\" />","chevron-left":"<path d=\"m15 18-6-6 6-6\" />","chevron-down":"<path d=\"m6 9 6 6 6-6\" />","chevron-up":"<path d=\"m18 15-6-6-6 6\" />","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />","crosshair":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><line x1=\"22\" x2=\"18\" y1=\"12\" y2=\"12\" /><line x1=\"6\" x2=\"2\" y1=\"12\" y2=\"12\" /><line x1=\"12\" x2=\"12\" y1=\"6\" y2=\"2\" /><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"18\" />","locate-fixed":"<line x1=\"2\" x2=\"5\" y1=\"12\" y2=\"12\" /><line x1=\"19\" x2=\"22\" y1=\"12\" y2=\"12\" /><line x1=\"12\" x2=\"12\" y1=\"2\" y2=\"5\" /><line x1=\"12\" x2=\"12\" y1=\"19\" y2=\"22\" /><circle cx=\"12\" cy=\"12\" r=\"7\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /><path d=\"M3 3v5h5\" />","tags":"<path d=\"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z\" /><path d=\"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193\" /><circle cx=\"10.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" />","globe-2":"<path d=\"M21.54 15H17a2 2 0 0 0-2 2v4.54\" /><path d=\"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17\" /><path d=\"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05\" /><circle cx=\"12\" cy=\"12\" r=\"10\" />","cloud-sun":"<path d=\"M12 2v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"M20 12h2\" /><path d=\"m19.07 4.93-1.41 1.41\" /><path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\" /><path d=\"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z\" />","bookmark":"<path d=\"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z\" />","navigation":"<polygon points=\"3 11 22 2 13 21 11 13 3 11\" />","clock-3":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 6v6h4\" />","footprints":"<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\" /><path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\" /><path d=\"M16 17h4\" /><path d=\"M4 13h4\" />","mountain":"<path d=\"m8 3 4 8 5-5 5 15H2L8 3z\" />","waves":"<path d=\"M2 12q2.5 2 5 0t5 0 5 0 5 0\" /><path d=\"M2 19q2.5 2 5 0t5 0 5 0 5 0\" /><path d=\"M2 5q2.5 2 5 0t5 0 5 0 5 0\" />","landmark":"<path d=\"M10 18v-7\" /><path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\" /><path d=\"M14 18v-7\" /><path d=\"M18 18v-7\" /><path d=\"M3 22h18\" /><path d=\"M6 18v-7\" />","utensils-crossed":"<path d=\"m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8\" /><path d=\"M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7\" /><path d=\"m2.1 21.8 6.4-6.3\" /><path d=\"m19 5-7 7\" />","tent":"<path d=\"M3.5 21 14 3\" /><path d=\"M20.5 21 10 3\" /><path d=\"M15.5 21 12 15l-3.5 6\" /><path d=\"M2 21h20\" />","camera":"<path d=\"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z\" /><circle cx=\"12\" cy=\"13\" r=\"3\" />","building-2":"<path d=\"M10 12h4\" /><path d=\"M10 8h4\" /><path d=\"M14 21v-3a2 2 0 0 0-4 0v3\" /><path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\" /><path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\" />","sprout":"<path d=\"M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3\" /><path d=\"M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4\" /><path d=\"M5 21h14\" />","play":"<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\" />","pause":"<rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" /><rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\" />","check":"<path d=\"M20 6 9 17l-5-5\" />","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />","heart":"<path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" />","message-circle":"<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\" />","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /><path d=\"m21.854 2.147-10.94 10.939\" />","mic":"<path d=\"M12 19v3\" /><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\" /><rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\" />","volume-2":"<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\" /><path d=\"M16 9a5 5 0 0 1 0 6\" /><path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\" />","calendar-days":"<path d=\"M8 2v3\" /><path d=\"M16 2v3\" /><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" /><path d=\"M3 9h18\" /><path d=\"M8 13h.01\" /><path d=\"M12 13h.01\" /><path d=\"M16 13h.01\" /><path d=\"M8 17h.01\" /><path d=\"M12 17h.01\" /><path d=\"M16 17h.01\" />","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\" /><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\" />","share-2":"<circle cx=\"18\" cy=\"5\" r=\"3\" /><circle cx=\"6\" cy=\"12\" r=\"3\" /><circle cx=\"18\" cy=\"19\" r=\"3\" /><line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\" /><line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\" />","download":"<path d=\"M12 15V3\" /><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /><path d=\"m7 10 5 5 5-5\" />","smartphone":"<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\" /><path d=\"M12 18h.01\" />","monitor":"<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\" /><line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\" /><line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\" /><path d=\"M12 20v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"m17.66 17.66 1.41 1.41\" /><path d=\"M2 12h2\" /><path d=\"M20 12h2\" /><path d=\"m6.34 17.66-1.41 1.41\" /><path d=\"m19.07 4.93-1.41 1.41\" />","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />","star":"<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"m9 12 2 2 4-4\" />","signpost":"<path d=\"M12 13v8\" /><path d=\"M12 3v3\" /><path d=\"M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z\" />","ticket":"<path d=\"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\" /><path d=\"M13 5v2\" /><path d=\"M13 17v2\" /><path d=\"M13 11v2\" />","info":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 16v-4\" /><path d=\"M12 8h.01\" />","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />","trash-2":"<path d=\"M10 11v6\" /><path d=\"M14 11v6\" /><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\" /><path d=\"M3 6h18\" /><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />","pencil":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" /><path d=\"m15 5 4 4\" />","share":"<path d=\"M12 2v13\" /><path d=\"m16 6-4-4-4 4\" /><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\" />","map-pinned":"<path d=\"M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 01-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0112 0\" /><path d=\"M4.474 15h-.197a1 1 0 00-.969.753l-1.097 4.35a1.5 1.5 0 001.444 1.898L20.344 22a1.5 1.5 0 001.446-1.897l-1.098-4.35a1 1 0 00-.969-.753h-.197\" /><circle cx=\"12\" cy=\"8\" r=\"2\" />","mouse-pointer-click":"<path d=\"M14 4.1 12 6\" /><path d=\"m5.1 8-2.9-.8\" /><path d=\"m6 12-1.9 2\" /><path d=\"M7.2 2.2 8 5.1\" /><path d=\"M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z\" />","activity":"<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\" />","grip-vertical":"<circle cx=\"9\" cy=\"12\" r=\"1\" /><circle cx=\"9\" cy=\"5\" r=\"1\" /><circle cx=\"9\" cy=\"19\" r=\"1\" /><circle cx=\"15\" cy=\"12\" r=\"1\" /><circle cx=\"15\" cy=\"5\" r=\"1\" /><circle cx=\"15\" cy=\"19\" r=\"1\" />","filter":"<path d=\"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z\" />","sliders-horizontal":"<path d=\"M10 5H3\" /><path d=\"M12 19H3\" /><path d=\"M14 3v4\" /><path d=\"M16 17v4\" /><path d=\"M21 12h-9\" /><path d=\"M21 19h-5\" /><path d=\"M21 5h-7\" /><path d=\"M8 10v4\" /><path d=\"M8 12H3\" />","external-link":"<path d=\"M15 3h6v6\" /><path d=\"M10 14 21 3\" /><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />","maximize-2":"<path d=\"M15 3h6v6\" /><path d=\"m21 3-7 7\" /><path d=\"m3 21 7-7\" /><path d=\"M9 21H3v-6\" />","grid-2x2":"<path d=\"M12 3v18\" /><path d=\"M3 12h18\" /><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" />","copy":"<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />","mail":"<path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\" /><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\" />","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /><path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />","log-out":"<path d=\"m16 17 5-5-5-5\" /><path d=\"M21 12H9\" /><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" />","hard-drive":"<path d=\"M10 16h.01\" /><path d=\"M2.212 11.577a2 2 0 0 0-.212.896V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.527a2 2 0 0 0-.212-.896L18.55 5.11A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\" /><path d=\"M21.946 12.013H2.054\" /><path d=\"M6 16h.01\" />","map-pin-house":"<path d=\"M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z\" /><path d=\"M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2\" /><path d=\"M18 22v-3\" /><circle cx=\"10\" cy=\"10\" r=\"3\" />","timer":"<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\" /><line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\" /><circle cx=\"12\" cy=\"14\" r=\"8\" />","trending-up":"<path d=\"M16 7h6v6\" /><path d=\"m22 7-8.5 8.5-5-5L2 17\" />","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m16 9-5.5 5.5L8 12\" />","sparkle":"<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" />","route-off":"<circle cx=\"6\" cy=\"19\" r=\"3\" /><path d=\"M9 19h8.5c.4 0 .9-.1 1.3-.2\" /><path d=\"M5.2 5.2A3.5 3.53 0 0 0 6.5 12H12\" /><path d=\"m2 2 20 20\" /><path d=\"M21 15.3a3.5 3.5 0 0 0-3.3-3.3\" /><path d=\"M15 5h-4.3\" /><circle cx=\"18\" cy=\"5\" r=\"3\" />","accessibility":"<circle cx=\"16\" cy=\"4\" r=\"1\" /><path d=\"m18 19 1-7-6 1\" /><path d=\"m5 8 3-3 5.5 3-2.36 3.5\" /><path d=\"M4.24 14.5a5 5 0 0 0 6.88 6\" /><path d=\"M13.76 17.5a5 5 0 0 0-6.88-6\" />","wifi-off":"<path d=\"M12 20h.01\" /><path d=\"M8.5 16.429a5 5 0 0 1 7 0\" /><path d=\"M5 12.859a10 10 0 0 1 5.17-2.69\" /><path d=\"M19 12.859a10 10 0 0 0-2.007-1.523\" /><path d=\"M2 8.82a15 15 0 0 1 4.177-2.643\" /><path d=\"M22 8.82a15 15 0 0 0-11.288-3.764\" /><path d=\"m2 2 20 20\" />","folder":"<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\" />"};

  /* ek ikonlar: auth & onboarding */
  const EXTRA_ICONS = {
    "trees":"<path d=\"M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z\" /><path d=\"M7 16v6\" /><path d=\"M13 19v3\" /><path d=\"M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5\" />",
    "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />",
    "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" /><path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" /><path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" /><path d=\"m2 2 20 20\" />",
    "user-plus": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /><circle cx=\"9\" cy=\"7\" r=\"4\" /><line x1=\"19\" x2=\"19\" y1=\"8\" y2=\"14\" /><line x1=\"22\" x2=\"16\" y1=\"11\" y2=\"11\" />",
    "arrow-left": "<path d=\"m12 19-7-7 7-7\" /><path d=\"M19 12H5\" />",
    "key-round": "<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\" /><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />",
    "fingerprint": "<path d=\"M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4\" /><path d=\"M14 13.12c0 2.38 0 6.38-1 8.88\" /><path d=\"M17.29 21.02c.12-.6.43-2.3.5-3.02\" /><path d=\"M2 12a10 10 0 0 1 18-6\" /><path d=\"M2 16h.01\" /><path d=\"M21.8 16c.2-2 .131-5.354 0-6\" /><path d=\"M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2\" /><path d=\"M8.65 22c.21-.66.45-1.32.57-2\" /><path d=\"M9 6.8a6 6 0 0 1 9 5.2v2\" />",
    "mail-check": "<path d=\"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8\" /><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\" /><path d=\"m16 19 2 2 4-4\" />",
    "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /><path d=\"M21 3v5h-5\" /><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /><path d=\"M8 16H3v5\" />",
    "scan-face": "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\" /><path d=\"M17 3h2a2 2 0 0 1 2 2v2\" /><path d=\"M21 17v2a2 2 0 0 1-2 2h-2\" /><path d=\"M7 21H5a2 2 0 0 1-2-2v-2\" /><path d=\"M8 14s1.5 2 4 2 4-2 4-2\" /><path d=\"M9 9h.01\" /><path d=\"M15 9h.01\" />",
    "badge-check": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\" /><path d=\"m16 9-5.5 5.5L8 12\" />",
    "apple": "<path fill=\"currentColor\" stroke=\"none\" d=\"M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z\"/>",
    "google": "<path fill=\"#4285F4\" stroke=\"none\" d=\"M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z\"/><path fill=\"#34A853\" stroke=\"none\" d=\"M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z\"/><path fill=\"#FBBC05\" stroke=\"none\" d=\"M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z\"/><path fill=\"#EA4335\" stroke=\"none\" d=\"M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z\"/>"
  };
  Object.assign(ICONS, EXTRA_ICONS);

  const SCREENS = [
    { id: "on-giris", href: "on-giris.html", label: "Ön giriş", icon: "sparkles", kind: "mobile" },
    { id: "giris", href: "giris.html", label: "Giriş", icon: "key-round", kind: "mobile" },
    { id: "sifre-sifirla", href: "sifre-sifirla.html", label: "Sıfırlama", icon: "refresh-cw", kind: "mobile" },
    { id: "kayit", href: "kayit.html", label: "Kayıt", icon: "user-plus", kind: "mobile" },
    { id: "dogrulama", href: "dogrulama.html", label: "Doğrulama", icon: "mail-check", kind: "mobile" },
    { id: "ilgi-alanlari", href: "ilgi-alanlari.html", label: "İlgi", icon: "sliders-horizontal", kind: "mobile" },
    { id: "kesif", href: "kesif.html", label: "Keşif", icon: "compass", kind: "mobile" },
    { id: "izler", href: "izler.html", label: "İzler", icon: "users", kind: "mobile" },
    { id: "yer", href: "yer.html", label: "Yer", icon: "landmark", kind: "mobile" },
    { id: "atlas-ai", href: "atlas-ai.html", label: "Atlas AI", icon: "sparkles", kind: "mobile" },
    { id: "masaustu-on-giris", href: "masaustu-on-giris.html", label: "PC giriş", icon: "key-round", kind: "desktop" },
    { id: "masaustu-kayit", href: "masaustu-kayit.html", label: "PC kayıt", icon: "user-plus", kind: "desktop" },
    { id: "masaustu-ilgi", href: "masaustu-ilgi.html", label: "PC ilgi", icon: "sliders-horizontal", kind: "desktop" },
    { id: "masaustu-kesif", href: "masaustu-kesif.html", label: "PC keşif", icon: "monitor", kind: "desktop" },
    { id: "rota", href: "rota.html", label: "Rota", icon: "route", kind: "desktop" },
    { id: "profil", href: "profil.html", label: "Profil", icon: "user-round", kind: "desktop" },
  ];

  const params = new URLSearchParams(location.search);
  const embed = params.get("embed") === "1";
  const forcedTheme = params.get("theme");

  const safeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* sandbox / gizli mod */
      }
    },
  };

  /* --------------------------------------------------------------- ikonlar */
  function paintIcons(root = document) {
    root.querySelectorAll("svg[data-icon]").forEach((node) => {
      const name = node.getAttribute("data-icon");
      const body = ICONS[name];
      if (!body) {
        node.setAttribute("data-missing", name);
        return;
      }
      node.setAttribute("viewBox", "0 0 24 24");
      node.setAttribute("aria-hidden", "true");
      node.setAttribute("focusable", "false");
      if (!node.getAttribute("class")) node.setAttribute("class", "i");
      node.innerHTML = body;
    });
  }

  /* ------------------------------------------------------------ durum çubuğu */
  const STATUS_ICONS = `
    <svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor"/><rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="currentColor"/><rect x="15" y="0.5" width="3" height="11.5" rx="1" fill="currentColor" opacity=".45"/></svg>
    <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M8 10.6a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm0-4.2c1.2 0 2.3.45 3.1 1.2l1.2-1.3A6.4 6.4 0 0 0 8 4.4a6.4 6.4 0 0 0-4.3 1.9l1.2 1.3A4.5 4.5 0 0 1 8 6.4Zm0-3.6c2 0 3.8.75 5.2 2l1.2-1.3A9 9 0 0 0 8 .8a9 9 0 0 0-6.4 2.7l1.2 1.3A7.3 7.3 0 0 1 8 2.8Z" fill="currentColor"/></svg>
    <svg viewBox="0 0 27 12" aria-hidden="true"><rect x="0.5" y="0.5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".55"/><rect x="2" y="2" width="17" height="8" rx="1.9" fill="currentColor"/><path d="M24.5 4.2v3.6c1.3-.3 2-1 2-1.8s-.7-1.5-2-1.8Z" fill="currentColor" opacity=".55"/></svg>`;

  function paintStatusbars() {
    document.querySelectorAll("[data-statusbar]").forEach((node) => {
      const variant = node.getAttribute("data-statusbar");
      if (variant === "light") node.classList.add("statusbar--light");
      node.innerHTML = `<span>09:41</span><span class="statusbar__island" aria-hidden="true"></span><span class="statusbar__icons">${STATUS_ICONS}</span>`;
    });
  }

  /* --------------------------------------------------------------- dalga */
  const WAVE = [6, 10, 14, 9, 16, 22, 13, 18, 24, 15, 11, 20, 26, 14, 9, 17, 22, 10, 7, 13, 19, 12];
  function paintWaves() {
    document.querySelectorAll("[data-wave]").forEach((node) => {
      node.innerHTML = WAVE.map((h) => `<i style="height:${h}px"></i>`).join("");
    });
  }

  /* ----------------------------------------------------------------- tema */
  function currentTheme() {
    if (forcedTheme === "light" || forcedTheme === "dark") return forcedTheme;
    return safeStorage.get("atlasia.ui.theme") === "light" ? "light" : "dark";
  }
  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) safeStorage.set("atlasia.ui.theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f5f3ea" : "#02120f");
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.innerHTML = `<svg class="i" data-icon="${theme === "light" ? "moon" : "sun"}"></svg>`;
      btn.setAttribute("aria-label", theme === "light" ? "Koyu temaya geç" : "Açık temaya geç");
      btn.setAttribute("title", theme === "light" ? "Koyu tema (T)" : "Açık tema (T)");
    });
    document.querySelectorAll("[data-theme-seg] button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-theme-value") === theme);
    });
    paintIcons();
    const sun = document.querySelector("[data-theme-swatch]");
    if (sun) sun.textContent = theme === "light" ? "Açık" : "Koyu";
  }

  /* -------------------------------------------------------------- toolbar */
  function screenIndex() {
    const body = document.body;
    const id = body.getAttribute("data-screen");
    return Math.max(0, SCREENS.findIndex((s) => s.id === id));
  }

  function buildToolbar() {
    if (embed || document.body.hasAttribute("data-no-toolbar")) return;
    const index = screenIndex();
    const current = SCREENS[index];
    if (!current) return;
    const prev = SCREENS[(index - 1 + SCREENS.length) % SCREENS.length];
    const next = SCREENS[(index + 1) % SCREENS.length];

    const nav = document.createElement("nav");
    nav.className = "toolbar";
    nav.setAttribute("aria-label", "Tasarım sunumu araçları");
    nav.innerHTML = `
      <div class="toolbar__brand">
        <span class="toolbar__mark"><svg class="i i--md" data-icon="compass"></svg></span>
        <span class="toolbar__name"><strong>Atlasia</strong><span>UI Kiti · v1</span></span>
      </div>
      <div class="toolbar__nav">
        <a class="tbtn" href="index.html" aria-label="Tüm ekranlar (G)" title="Tüm ekranlar (G)"><svg class="i" data-icon="grid-2x2"></svg></a>
        <a class="tbtn" href="${prev.href}" aria-label="Önceki ekran: ${prev.label}" title="Önceki (←)"><svg class="i" data-icon="chevron-left"></svg></a>
        <span class="toolbar__count">${String(index + 1).padStart(2, "0")} / ${String(SCREENS.length).padStart(2, "0")}</span>
        <a class="tbtn" href="${next.href}" aria-label="Sonraki ekran: ${next.label}" title="Sonraki (→)"><svg class="i" data-icon="chevron-right"></svg></a>
      </div>
      <div class="toolbar__screens">
        ${SCREENS.map(
          (s) => `<a href="${s.href}" class="${s.id === current.id ? "is-active" : ""}"${s.id === current.id ? ' aria-current="page"' : ""}>
            <svg class="i" data-icon="${s.icon}"></svg><span>${s.label}</span></a>`,
        ).join("")}
      </div>
      <div class="toolbar__actions">
        <button class="tbtn" type="button" data-theme-toggle title="Tema (T)"><svg class="i" data-icon="sun"></svg></button>
        <button class="tbtn" type="button" data-fullscreen title="Tam ekran (F)"><svg class="i" data-icon="maximize-2"></svg></button>
      </div>
      <div class="toolbar__hint"><kbd>←</kbd><kbd>→</kbd> ekran</div>`;
    document.body.appendChild(nav);
    paintIcons(nav);

    const strip = nav.querySelector(".toolbar__screens");
    const active = strip?.querySelector("a.is-active");
    if (strip && active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < strip.scrollLeft + 6 || right > strip.scrollLeft + strip.clientWidth - 6) {
        strip.scrollLeft = Math.max(0, left - strip.clientWidth / 2 + active.offsetWidth / 2);
      }
    }

    nav.querySelector("[data-fullscreen]")?.addEventListener("click", toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  /* --------------------------------------------------------------- ölçek */
  function fitStage() {
    const stage = document.querySelector(".showcase__stage");
    const inner = document.querySelector(".showcase__inner");
    if (!stage || !inner) return;
    if (embed) {
      inner.style.transform = "none";
      return;
    }
    const area = stage.getBoundingClientRect();
    const naturalW = inner.offsetWidth;
    const naturalH = inner.offsetHeight;
    if (!naturalW || !naturalH) return;
    const padX = 40;
    const padY = 26;
    const scale = Math.min((area.width - padX) / naturalW, (area.height - padY) / naturalH, 1);
    inner.style.transform = `translate(-50%, -50%) scale(${Math.max(0.2, scale)})`;
    document.documentElement.style.setProperty("--ui-scale", String(scale));
  }

  /* ---------------------------------------------------------- galeri ölçek */
  function fitPreviewFrames() {
    document.querySelectorAll("[data-preview]").forEach((frame) => {
      const iframe = frame.querySelector("iframe");
      if (!iframe) return;
      const desktop = frame.getAttribute("data-preview") === "desktop";
      const size = (frame.getAttribute("data-size") || (desktop ? "1462x946" : "412x866")).split("x");
      const maxW = Number(size[0]);
      const maxH = Number(size[1]);
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      if (!width || !height) return;
      const contain = frame.getAttribute("data-fit") === "contain";
      const scale = contain
        ? Math.min(width / maxW, height / maxH)
        : Math.max(width / maxW, height / maxH);
      iframe.style.width = `${maxW}px`;
      iframe.style.height = `${maxH}px`;
      iframe.style.transform = `translate(-50%, -50%) scale(${scale})`;
    });
  }

  /* ----------------------------------------------------------------- boot */
  const theme = currentTheme();
  applyTheme(theme, true);

  if (embed) document.body.classList.add("embed");

  paintIcons();
  paintStatusbars();
  paintWaves();
  buildToolbar();

  const isGallery = document.body.hasAttribute("data-gallery");

  /** Aynı kaynaktaki önizleme çerçeveleri temayı localStorage'dan okur. */
  const syncFrames = () => {
    const active = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll("iframe[data-theme-sync]").forEach((frame) => {
      try {
        const frameTheme = frame.contentDocument?.documentElement?.getAttribute("data-theme");
        if (frameTheme && frameTheme !== active) frame.contentWindow.location.reload();
      } catch {
        /* çerçeve henüz hazır değil */
      }
    });
  };

  if (isGallery) {
    fitPreviewFrames();
    window.addEventListener("resize", fitPreviewFrames);
    window.addEventListener("load", () => {
      fitPreviewFrames();
      syncFrames();
    });
  } else {
    fitStage();
    window.addEventListener("resize", fitStage);
    if (document.fonts?.ready) document.fonts.ready.then(fitStage);
    window.addEventListener("load", fitStage);
  }

  document.querySelectorAll("[data-theme-seg] button").forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.getAttribute("data-theme-value") === "light" ? "light" : "dark"));
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      const nextTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      if (isGallery) {
        document.querySelectorAll("iframe[data-theme-sync]").forEach((frame) => {
          try {
            frame.contentWindow.location.reload();
          } catch {
            /* çerçeve hazır değilse ilk yüklemede doğru temayı alır */
          }
        });
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "t") {
      const nextTheme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      return;
    }
    if (key === "f") {
      toggleFullscreen();
      return;
    }
    if (isGallery || embed) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const index = screenIndex();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const target = SCREENS[(index + step + SCREENS.length) % SCREENS.length];
      location.href = target.href;
    }
    if (key === "g") location.href = "index.html";
  });
})();
