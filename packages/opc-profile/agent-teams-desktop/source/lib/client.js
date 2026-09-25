window.__ModuleLoader__.load({ id: "@nanmicoder/dsh-agent-teams", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/opc-profile/agent-teams-desktop/source/lib/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_jsx_runtime9 = require("react/jsx-runtime");
var import_react11 = require("react");
var import_client = require("react-dom/client");

// packages/opc-profile/agent-teams-desktop/source/lib/client/ActivityPanel.js
var import_jsx_runtime7 = require("react/jsx-runtime");
var import_react8 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();

// node_modules/lucide-react/dist/esm/Icon.js
var import_react = require("react");

// node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/lucide-react/dist/esm/Icon.js
var Icon = (0, import_react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => {
    return (0, import_react.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    );
  }
);

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component = (0, import_react2.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
      ...props
    })
  );
  Component.displayName = `${iconName}`;
  return Component;
};

// node_modules/lucide-react/dist/esm/icons/archive.js
var Archive = createLucideIcon("Archive", [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
]);

// node_modules/lucide-react/dist/esm/icons/audio-lines.js
var AudioLines = createLucideIcon("AudioLines", [
  ["path", { d: "M2 10v3", key: "1fnikh" }],
  ["path", { d: "M6 6v11", key: "11sgs0" }],
  ["path", { d: "M10 3v18", key: "yhl04a" }],
  ["path", { d: "M14 8v7", key: "3a1oy3" }],
  ["path", { d: "M18 5v13", key: "123xd1" }],
  ["path", { d: "M22 10v3", key: "154ddg" }]
]);

// node_modules/lucide-react/dist/esm/icons/ban.js
var Ban = createLucideIcon("Ban", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
]);

// node_modules/lucide-react/dist/esm/icons/bot.js
var Bot = createLucideIcon("Bot", [
  ["path", { d: "M12 8V4H8", key: "hb8ula" }],
  ["rect", { width: "16", height: "12", x: "4", y: "8", rx: "2", key: "enze0r" }],
  ["path", { d: "M2 14h2", key: "vft8re" }],
  ["path", { d: "M20 14h2", key: "4cs60a" }],
  ["path", { d: "M15 13v2", key: "1xurst" }],
  ["path", { d: "M9 13v2", key: "rq6x2g" }]
]);

// node_modules/lucide-react/dist/esm/icons/brain.js
var Brain = createLucideIcon("Brain", [
  [
    "path",
    {
      d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",
      key: "l5xja"
    }
  ],
  [
    "path",
    {
      d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",
      key: "ep3f8r"
    }
  ],
  ["path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4", key: "1p4c4q" }],
  ["path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375", key: "tmeiqw" }],
  ["path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5", key: "105sqy" }],
  ["path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396", key: "ql3yin" }],
  ["path", { d: "M19.938 10.5a4 4 0 0 1 .585.396", key: "1qfode" }],
  ["path", { d: "M6 18a4 4 0 0 1-1.967-.516", key: "2e4loj" }],
  ["path", { d: "M19.967 17.484A4 4 0 0 1 18 18", key: "159ez6" }]
]);

// node_modules/lucide-react/dist/esm/icons/check.js
var Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

// node_modules/lucide-react/dist/esm/icons/chevron-right.js
var ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);

// node_modules/lucide-react/dist/esm/icons/circle-check.js
var CircleCheck = createLucideIcon("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);

// node_modules/lucide-react/dist/esm/icons/circle-dollar-sign.js
var CircleDollarSign = createLucideIcon("CircleDollarSign", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", key: "1h4pet" }],
  ["path", { d: "M12 18V6", key: "zqpxq5" }]
]);

// node_modules/lucide-react/dist/esm/icons/circle-dot.js
var CircleDot = createLucideIcon("CircleDot", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }]
]);

// node_modules/lucide-react/dist/esm/icons/clapperboard.js
var Clapperboard = createLucideIcon("Clapperboard", [
  [
    "path",
    { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z", key: "1tn4o7" }
  ],
  ["path", { d: "m6.2 5.3 3.1 3.9", key: "iuk76l" }],
  ["path", { d: "m12.4 3.4 3.1 4", key: "6hsd6n" }],
  ["path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", key: "ltgou9" }]
]);

// node_modules/lucide-react/dist/esm/icons/copy.js
var Copy = createLucideIcon("Copy", [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
]);

// node_modules/lucide-react/dist/esm/icons/download.js
var Download = createLucideIcon("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);

// node_modules/lucide-react/dist/esm/icons/earth.js
var Earth = createLucideIcon("Earth", [
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54", key: "1djwo0" }],
  [
    "path",
    {
      d: "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",
      key: "1tzkfa"
    }
  ],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05", key: "14pb5j" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
]);

// node_modules/lucide-react/dist/esm/icons/external-link.js
var ExternalLink = createLucideIcon("ExternalLink", [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
]);

// node_modules/lucide-react/dist/esm/icons/eye-off.js
var EyeOff = createLucideIcon("EyeOff", [
  [
    "path",
    {
      d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
      key: "ct8e1f"
    }
  ],
  ["path", { d: "M14.084 14.158a3 3 0 0 1-4.242-4.242", key: "151rxh" }],
  [
    "path",
    {
      d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
      key: "13bj9a"
    }
  ],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
]);

// node_modules/lucide-react/dist/esm/icons/eye.js
var Eye = createLucideIcon("Eye", [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);

// node_modules/lucide-react/dist/esm/icons/file-check-2.js
var FileCheck2 = createLucideIcon("FileCheck2", [
  ["path", { d: "M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4", key: "1pf5j1" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "m3 15 2 2 4-4", key: "1lhrkk" }]
]);

// node_modules/lucide-react/dist/esm/icons/file-text.js
var FileText = createLucideIcon("FileText", [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
]);

// node_modules/lucide-react/dist/esm/icons/heart-pulse.js
var HeartPulse = createLucideIcon("HeartPulse", [
  [
    "path",
    {
      d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
      key: "c3ymky"
    }
  ],
  ["path", { d: "M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27", key: "1uw2ng" }]
]);

// node_modules/lucide-react/dist/esm/icons/image.js
var Image = createLucideIcon("Image", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
]);

// node_modules/lucide-react/dist/esm/icons/lightbulb.js
var Lightbulb = createLucideIcon("Lightbulb", [
  [
    "path",
    {
      d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
      key: "1gvzjb"
    }
  ],
  ["path", { d: "M9 18h6", key: "x1upvd" }],
  ["path", { d: "M10 22h4", key: "ceow96" }]
]);

// node_modules/lucide-react/dist/esm/icons/message-circle.js
var MessageCircle = createLucideIcon("MessageCircle", [
  ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }]
]);

// node_modules/lucide-react/dist/esm/icons/monitor-cog.js
var MonitorCog = createLucideIcon("MonitorCog", [
  ["path", { d: "M12 17v4", key: "1riwvh" }],
  ["path", { d: "m15.2 4.9-.9-.4", key: "12wd2u" }],
  ["path", { d: "m15.2 7.1-.9.4", key: "1r2vl7" }],
  ["path", { d: "m16.9 3.2-.4-.9", key: "3zbo91" }],
  ["path", { d: "m16.9 8.8-.4.9", key: "1qr2dn" }],
  ["path", { d: "m19.5 2.3-.4.9", key: "1rjrkq" }],
  ["path", { d: "m19.5 9.7-.4-.9", key: "heryx5" }],
  ["path", { d: "m21.7 4.5-.9.4", key: "17fqt1" }],
  ["path", { d: "m21.7 7.5-.9-.4", key: "14zyni" }],
  ["path", { d: "M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7", key: "1tnzv8" }],
  ["path", { d: "M8 21h8", key: "1ev6f3" }],
  ["circle", { cx: "18", cy: "6", r: "3", key: "1h7g24" }]
]);

// node_modules/lucide-react/dist/esm/icons/pencil.js
var Pencil = createLucideIcon("Pencil", [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);

// node_modules/lucide-react/dist/esm/icons/refresh-cw.js
var RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);

// node_modules/lucide-react/dist/esm/icons/rotate-ccw.js
var RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);

// node_modules/lucide-react/dist/esm/icons/save.js
var Save = createLucideIcon("Save", [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
]);

// node_modules/lucide-react/dist/esm/icons/search.js
var Search = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);

// node_modules/lucide-react/dist/esm/icons/send.js
var Send = createLucideIcon("Send", [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
]);

// node_modules/lucide-react/dist/esm/icons/settings.js
var Settings = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);

// node_modules/lucide-react/dist/esm/icons/smartphone.js
var Smartphone = createLucideIcon("Smartphone", [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2", key: "1yt0o3" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }]
]);

// node_modules/lucide-react/dist/esm/icons/sparkles.js
var Sparkles = createLucideIcon("Sparkles", [
  [
    "path",
    {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      key: "4pj2yx"
    }
  ],
  ["path", { d: "M20 3v4", key: "1olli1" }],
  ["path", { d: "M22 5h-4", key: "1gvqau" }],
  ["path", { d: "M4 17v2", key: "vumght" }],
  ["path", { d: "M5 18H3", key: "zchphs" }]
]);

// node_modules/lucide-react/dist/esm/icons/triangle-alert.js
var TriangleAlert = createLucideIcon("TriangleAlert", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
      key: "wmoenq"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);

// node_modules/lucide-react/dist/esm/icons/video.js
var Video = createLucideIcon("Video", [
  [
    "path",
    {
      d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
      key: "ftymec"
    }
  ],
  ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2", key: "158x01" }]
]);

// node_modules/lucide-react/dist/esm/icons/wrench.js
var Wrench = createLucideIcon("Wrench", [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
      key: "cbrjhi"
    }
  ]
]);

// node_modules/lucide-react/dist/esm/icons/x.js
var X = createLucideIcon("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);

// packages/opc-profile/agent-teams-desktop/source/lib/client/activity-model.js
var COMPACT_DAG_NODE_WIDTH = 92;
var COMPACT_DAG_NODE_HEIGHT = 30;
var COMPACT_DAG_COLUMN_GAP = 26;
var COMPACT_DAG_ROW_GAP = 8;
function usesParallelTaskGrid(tasks) {
  if (tasks.length === 0)
    return false;
  const taskIds = new Set(tasks.map((task) => task.id));
  return tasks.every((task) => task.dependencies.every((dependency) => !taskIds.has(dependency)));
}
function dependencyFocusTaskId(pinnedTaskId, keyboardTaskId, hoverTaskId) {
  return pinnedTaskId ?? keyboardTaskId ?? hoverTaskId;
}
function taskStages(tasks) {
  const byDepth = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    const depth = Number.isFinite(task.depth) ? Math.max(0, Math.floor(task.depth)) : 0;
    const stage = byDepth.get(depth) ?? [];
    stage.push(task);
    byDepth.set(depth, stage);
  }
  return [...byDepth.entries()].sort(([left], [right]) => left - right).map(([depth, stageTasks]) => ({
    depth,
    tasks: stageTasks.slice().sort((left, right) => left.id.localeCompare(right.id, "en", { numeric: true }))
  }));
}
function compactDagLayout(tasks) {
  const stages = taskStages(tasks);
  const positions = /* @__PURE__ */ new Map();
  const nodes = [];
  for (const [column, stage] of stages.entries()) {
    for (const [row, task] of stage.tasks.entries()) {
      const x = column * (COMPACT_DAG_NODE_WIDTH + COMPACT_DAG_COLUMN_GAP);
      const y = row * (COMPACT_DAG_NODE_HEIGHT + COMPACT_DAG_ROW_GAP);
      positions.set(task.id, { x, y });
      nodes.push({ task, x, y });
    }
  }
  const edges = [];
  for (const task of tasks) {
    const target = positions.get(task.id);
    if (target === void 0)
      continue;
    for (const dependency of task.dependencies) {
      const source = positions.get(dependency);
      if (source === void 0)
        continue;
      const x1 = source.x + COMPACT_DAG_NODE_WIDTH;
      const y1 = source.y + COMPACT_DAG_NODE_HEIGHT / 2;
      const x2 = target.x;
      const y2 = target.y + COMPACT_DAG_NODE_HEIGHT / 2;
      edges.push({
        from: dependency,
        to: task.id,
        path: `M${x1} ${y1}C${x1 + 14} ${y1},${x2 - 14} ${y2},${x2} ${y2}`
      });
    }
  }
  const rows = Math.max(1, ...stages.map((stage) => stage.tasks.length));
  return {
    width: stages.length === 0 ? 0 : stages.length * COMPACT_DAG_NODE_WIDTH + (stages.length - 1) * COMPACT_DAG_COLUMN_GAP,
    height: stages.length === 0 ? 0 : rows * COMPACT_DAG_NODE_HEIGHT + (rows - 1) * COMPACT_DAG_ROW_GAP,
    nodes,
    edges
  };
}
function relatedTaskIds(taskId, tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  if (!byId.has(taskId))
    return /* @__PURE__ */ new Set();
  const dependents = /* @__PURE__ */ new Map();
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      const targets2 = dependents.get(dependency) ?? [];
      targets2.push(task.id);
      dependents.set(dependency, targets2);
    }
  }
  const related = /* @__PURE__ */ new Set();
  const upstreamSeen = /* @__PURE__ */ new Set();
  const downstreamSeen = /* @__PURE__ */ new Set();
  const visitUpstream = (id) => {
    if (upstreamSeen.has(id))
      return;
    upstreamSeen.add(id);
    related.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? [])
      visitUpstream(dependency);
  };
  const visitDownstream = (id) => {
    if (downstreamSeen.has(id))
      return;
    downstreamSeen.add(id);
    related.add(id);
    for (const dependent of dependents.get(id) ?? [])
      visitDownstream(dependent);
  };
  visitUpstream(taskId);
  visitDownstream(taskId);
  return related;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/activity-monitor.js
var targets = /* @__PURE__ */ new Map();
var targetListeners = /* @__PURE__ */ new Set();
var snapshotListeners = /* @__PURE__ */ new Set();
var targetSnapshot = [];
var activitySnapshots = { teams: [], archivedTeams: [], controlPlaneEnabled: false };
function targetKey(sessionId, teamId) {
  return `${sessionId}\0${teamId}`;
}
function publishTargets() {
  targetSnapshot = [...targets.values()].filter((target) => target.active).map(({ key, sessionId, teamId }) => ({ key, sessionId, teamId }));
  for (const listener of targetListeners)
    listener();
}
function subscribeActivityMonitorTargets(listener) {
  targetListeners.add(listener);
  return () => {
    targetListeners.delete(listener);
  };
}
function getActivityMonitorTargetsSnapshot() {
  return targetSnapshot;
}
function monitorAgentTeam(sessionId, teamId) {
  const owner = sessionId.trim();
  const id = teamId.trim();
  if (owner === "" || id === "")
    return () => {
    };
  const key = targetKey(owner, id);
  const existing = targets.get(key);
  if (existing === void 0) {
    targets.set(key, { key, sessionId: owner, teamId: id, refs: 1, active: true });
    publishTargets();
  } else {
    existing.refs += 1;
    if (!existing.active) {
      existing.active = true;
      publishTargets();
    }
  }
  let released = false;
  return () => {
    if (released)
      return;
    released = true;
    const current = targets.get(key);
    if (current === void 0)
      return;
    current.refs -= 1;
    if (current.refs <= 0) {
      targets.delete(key);
      if (current.active)
        publishTargets();
    }
  };
}
function settleActivityMonitorTargets(keys) {
  let changed = false;
  for (const key of keys) {
    const target = targets.get(key);
    if (target?.active !== true)
      continue;
    target.active = false;
    changed = true;
  }
  if (changed)
    publishTargets();
}
function subscribeActivitySnapshots(listener) {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
}
function getActivitySnapshotsSnapshot() {
  return activitySnapshots;
}
function updateActivitySnapshots(update) {
  const next = {
    teams: update.teams ?? activitySnapshots.teams,
    archivedTeams: update.archivedTeams ?? activitySnapshots.archivedTeams,
    controlPlaneEnabled: update.controlPlaneEnabled ?? activitySnapshots.controlPlaneEnabled
  };
  if (next.teams === activitySnapshots.teams && next.archivedTeams === activitySnapshots.archivedTeams && next.controlPlaneEnabled === activitySnapshots.controlPlaneEnabled)
    return;
  activitySnapshots = next;
  for (const listener of snapshotListeners)
    listener();
}
var ACTIVITY_POLL_MS = 1e3;
var ACTIVITY_STATE_URL = "/plugins/dsh-agent-teams/state";
var TEAM_CHAT_URL = "/plugins/dsh-agent-teams/chat";
async function loadTeamChatPage(team, cursor = 0, limit = 100, fetcher = fetch) {
  const url = `${TEAM_CHAT_URL}?workspace=${encodeURIComponent(team.workspace)}&teamId=${encodeURIComponent(team.teamId)}&sessionId=${encodeURIComponent(team.captainSessionId)}&cursor=${cursor}&limit=${limit}`;
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok)
    throw new Error(`team chat request failed: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.messages) || typeof body.messageCount !== "number" || typeof body.chatCursor !== "string") {
    throw new Error("team chat response is invalid");
  }
  return {
    messages: body.messages,
    messageCount: body.messageCount,
    chatCursor: body.chatCursor,
    ...typeof body.nextCursor === "string" ? { nextCursor: body.nextCursor } : {},
    hasMore: body.hasMore === true
  };
}
function startActivityPolling(monitorTargets, runtime = {}) {
  if (monitorTargets.length === 0 && runtime.pollAll !== true) {
    return { firstTick: Promise.resolve(), stop: () => {
    } };
  }
  const fetchState = runtime.fetchState ?? ((url, init) => fetch(url, init));
  const schedule = runtime.schedule ?? ((callback, intervalMs) => setInterval(callback, intervalMs));
  const cancel = runtime.cancel ?? ((timer2) => {
    clearInterval(timer2);
  });
  const publishSnapshots = runtime.publishSnapshots ?? updateActivitySnapshots;
  const settleTargets = runtime.settleTargets ?? settleActivityMonitorTargets;
  let cancelled = false;
  let inFlight = false;
  let controller;
  let archivedLoaded = false;
  const tick = async () => {
    if (inFlight || cancelled)
      return;
    inFlight = true;
    controller = new AbortController();
    try {
      const liveResponse = await fetchState(ACTIVITY_STATE_URL, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!liveResponse.ok)
        return;
      const body = await liveResponse.json();
      if (cancelled || !Array.isArray(body.teams))
        return;
      const liveTeams = body.teams;
      publishSnapshots({ teams: liveTeams, controlPlaneEnabled: body.controlPlaneEnabled === true });
      const missing = monitorTargets.filter((target) => !liveTeams.some((team) => team.captainSessionId === target.sessionId && team.teamId === target.teamId));
      if (missing.length === 0 || archivedLoaded)
        return;
      const archivedResponse = await fetchState(`${ACTIVITY_STATE_URL}?archived=1`, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!archivedResponse.ok)
        return;
      const archivedBody = await archivedResponse.json();
      if (cancelled || !Array.isArray(archivedBody.teams))
        return;
      publishSnapshots({ archivedTeams: archivedBody.teams });
      archivedLoaded = true;
      if (missing.length > 0)
        settleTargets(new Set(missing.map((target) => target.key)));
    } catch (error) {
      if (error?.name === "AbortError")
        return;
    } finally {
      inFlight = false;
    }
  };
  const firstTick = tick();
  const timer = schedule(() => {
    void tick();
  }, ACTIVITY_POLL_MS);
  return {
    firstTick,
    stop: () => {
      if (cancelled)
        return;
      cancelled = true;
      controller?.abort();
      cancel(timer);
    }
  };
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/TeamChatView.js
var import_jsx_runtime = require("react/jsx-runtime");
var import_react3 = require("react");

// packages/opc-profile/agent-teams-desktop/source/lib/client/artwork.js
var ART_BASE = "/plugins/dsh-agent-teams/assets/";
var AVATAR_BASE = "/plugins/dsh-agent-teams/avatars/";
var ROLE_ART = [
  [/digital.?human|avatar.?producer|数字人|虚拟人/, "digital-human-producer.png"],
  [/compliance|legal|governance|合规|法务|风控/, "compliance-reviewer.png"],
  [/customer.?service|support|客服|售后/, "customer-service.png"],
  [/comment.?ops|community|评论运营|社群/, "comment-ops.png"],
  [/competitor|competitive|radar|竞品|雷达/, "competitor-radar.png"],
  [/creative.?planner|creative.?strategy|策划|创意/, "creative-planner.png"],
  [/video|film|producer|剪辑|视频|制片/, "video-producer.png"],
  [/voice|tts|speech|配音|语音/, "voice-tts.png"],
  [/topic|editor|选题|编辑/, "topic-editor.png"],
  [/publisher|publish|release|distribution|发布|分发/, "publisher.png"],
  [/asset|library|素材|资产/, "asset-manager.png"],
  [/growth|acquisition|增长|投放/, "growth-analyst.png"],
  [/data.?analyst|data|数据分析/, "data-analyst.png"],
  [/research|analys|investig|explor|study|研究|分析|调查|探索|调研/, "researcher.png"],
  [/script|copywriter|writer|文案|编剧|写作|撰写/, "scriptwriter.png"],
  [/review|audit|quality|\bqa\b|test|verif|审查|审核|测试|质量/, "reviewer.png"],
  [/design|\bui\b|\bux\b|front|theme|accessib|设计|前端|主题/, "designer.png"],
  [/operations|\bops\b|运营|流程/, "operations.png"],
  [/engineer|dev\b|server|backend|\bapi\b|runtime|watcher|contract|工程|后端|服务|接口|开发|代码|编程|技术/, "tech-checker.png"]
];
var LEAD_ART = `${AVATAR_BASE}captain.png`;
var ACTION_ART = {
  working: `${ART_BASE}action-working.png`,
  idle: `${ART_BASE}action-sleeping.png`,
  unknown: `${ART_BASE}action-thinking.png`
};
function memberArtUrl(name, role) {
  const identity = `${name} ${role}`.toLowerCase();
  for (const [pattern, art] of ROLE_ART) {
    if (pattern.test(identity))
      return `${AVATAR_BASE}${art}`;
  }
  return null;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/team-chat-model.js
var CHAT_KIND_LABELS = {
  message: "协作消息",
  status: "进度同步",
  discussion: "任务讨论",
  assignment: "任务分派",
  objection: "反对意见",
  help: "请求协助",
  decision: "决策结论",
  tool: "工具调用",
  artifact: "产物交付",
  approval: "审批请求",
  system: "系统动态",
  summary: "组长总结"
};
function teamChatMessageLabel(kind) {
  return CHAT_KIND_LABELS[kind];
}
function naturalMentionName(value) {
  const name = value.trim().replace(/^@+/u, "");
  return name === "captain" ? "组长" : name;
}
function teamChatMentionNames(message) {
  const explicit = message.mentions?.filter((value) => value.trim() !== "") ?? [];
  const recipients = explicit.length > 0 ? explicit : message.to !== void 0 && message.to !== message.from ? [message.to] : [];
  const sender = message.from === void 0 ? "" : naturalMentionName(message.from);
  return [...new Set(recipients.map(naturalMentionName).filter((name) => name !== "" && name !== sender))];
}

// packages/opc-profile/agent-teams-desktop/source/lib/chat-presentation.js
var MAX_DISPLAY_LENGTH = 56;
function clean(value) {
  return value.replace(/```[\s\S]*?```/gu, " ").replace(/\{[^{}]{0,600}\}/gu, " ").replace(/\/?(?:Users|home|var|tmp)\/[^\s，。；;]+/gu, " ").replace(/[*#`_>-]+/gu, " ").replace(/(?:输出文件|保存路径|文件路径)[：:]?[^。！？\n]*/gu, " ").replace(/(?:任务|task)[ _-]?(?:id|编号)\s*[:：]?\s*[a-z0-9_-]+/giu, " ").replace(/(?:请更新|请调用|调用工具|tool(?: call)?|request_id)\s*[:：]?[^。！？\n]*/giu, " ").replace(/任务已完成[！!]?/gu, "").replace(/\s+/gu, " ").trim();
}
function truncate(value) {
  return value.length <= MAX_DISPLAY_LENGTH ? value : `${value.slice(0, MAX_DISPLAY_LENGTH - 1).trim()}…`;
}
function assignmentUpdate(content) {
  if (!/(?:任务已创建|新任务|立即开始任务|你的任务|请(?:立即|尽快)[^。]{0,30}(?:任务|审核|脚本|图片|视频))/u.test(content))
    return void 0;
  const role = content.match(/(热点(?:分析师|研究员|调研员)|脚本(?:策划师|撰写师|编剧)|内容审核员|审核员|生图设计师|视频制作师)/u)?.[1];
  if (role?.startsWith("热点"))
    return `${role}，先去摸一下最近的热点，有发现就在群里说。`;
  if (role?.includes("脚本") || role === "编剧")
    return `${role}，方向已经接上了，接下来把脚本落下来。`;
  if (role?.includes("审核"))
    return `${role}，这版该你把关了，重点看看有没有风险。`;
  if (role?.includes("生图"))
    return `${role}，脚本已经接上了，接下来把参考图做出来。`;
  if (role?.includes("视频"))
    return `${role}，素材已经齐了，接下来把成片做出来。`;
  const subject = content.match(/(?:任务[^「“\n]{0,24})[「“]([^」”\n]{2,36})[」”]/u)?.[1];
  return subject === void 0 ? void 0 : `这一步先做“${truncate(subject)}”，有进展就在群里说。`;
}
function reportUpdate(content) {
  if (/(?:脚本已完成|完成了?脚本|脚本.*(?:写好|整理好))/u.test(content)) {
    return "脚本我写好了，重点内容和拍摄节奏都已经整理好。";
  }
  if (/(?:审核|审查)/u.test(content) && /(?:已完成|结论|评分)/u.test(content)) {
    return /(?:较高|高风险|需修改|不建议发布|方可发布)/u.test(content) ? "我审完了：这版还有合规风险，改完再发更稳妥。" : "我审完了：整体没大问题，几个细节建议已经标出来了。";
  }
  const recommendation = content.match(/推荐(?:最佳)?选题[：:]\s*[「“"]([^」”"]{2,48})/u)?.[1];
  if (recommendation !== void 0)
    return truncate(`我查了一圈，建议先做“${recommendation}”。`);
  if (/热点/u.test(content) && /(?:核心发现|已完成|分析好了|摸清)/u.test(content)) {
    return "热点我摸清了，最值得跟的方向已经整理好了。";
  }
  return void 0;
}
function summarizeTeamChatContent(content, kind) {
  const normalized = content.replace(/\r/gu, "").trim();
  if (kind === "tool" || /(?:insufficient balance|rate limit|quota|error:|exception|failed)/iu.test(normalized)) {
    return "这个工具这次没跑通，我先不硬编结果，换一种方式继续。";
  }
  if (/(?:completed|已完成)/iu.test(normalized) && /(?:无法重新?claim|重新分配任务|stale attempt)/iu.test(normalized)) {
    return "这项任务已经结束了，我先不重复开工；要调整的话得重新安排。";
  }
  const assignment = assignmentUpdate(normalized);
  if (assignment !== void 0)
    return assignment;
  const report = reportUpdate(normalized);
  if (report !== void 0)
    return report;
  const cleaned = clean(normalized).replace(/^(?:队长|组长)[，,：:]?\s*/u, "");
  const firstSentence = cleaned.split(/[。！？\n]+/u).find((sentence) => sentence.trim().length > 3)?.trim() ?? cleaned;
  const compact = truncate(firstSentence);
  if (compact === "")
    return kind === "summary" ? "这一轮工作收齐了，我来汇总下一步。" : "我正在处理这一步，完成后马上同步。";
  if (/^[\x20-\x7e]+$/u.test(compact) && compact === normalized)
    return compact;
  return /[。！？]$/u.test(compact) ? compact : `${compact}。`;
}
function mergeDisplayMessages(messages) {
  const result = [];
  for (const message of messages) {
    const previous = result.at(-1);
    if (previous !== void 0 && previous.from === message.from && previous.kind === "status" && message.kind === "status") {
      result[result.length - 1] = {
        ...message,
        displayContent: message.displayContent ?? summarizeTeamChatContent(message.content, message.kind),
        mergedIds: [...previous.mergedIds ?? [previous.id], message.id]
      };
    } else
      result.push(message);
  }
  return result;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/ActivityPanel.module.css
var tagId = "@nanmicoder/dsh-agent-teams/ActivityPanel.module.css";
if (typeof document !== "undefined" && !document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]")) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@nanmicoder/dsh-agent-teams";
  tag.dataset.pluginCss = tagId;
  tag.textContent = 'html{--agent-teams-panel-width:388px;--agent-teams-panel-top:64px;--agent-teams-panel-bottom-gap:64px;--agent-teams-panel-min-height:560px;--agent-teams-panel-right:calc(18px + var(--dsh-sidebar-width,0px));--agent-teams-panel-gap:14px;--agent-teams-panel-shift:calc(var(--agent-teams-panel-width) + 18px + var(--agent-teams-panel-gap))}html[data-agent-teams-panel-open] [data-phase=active]{box-sizing:border-box;padding-right:var(--agent-teams-panel-shift)}[data-phase=active]{will-change:padding-right;transition:padding-right .36s cubic-bezier(.22,1,.36,1)}.i6pDkq_badge,.i6pDkq_panel{--dsw-alias-line-normal:var(--dsw-static-neutral-bluish-150,#e7e9ee);--dsw-alias-line-strong:color-mix(in srgb, var(--dsw-static-neutral-bluish-200,#e1e5ee) 50%, var(--dsw-static-neutral-bluish-300,#cfd3d6));--dsw-alias-bg-module:var(--dsw-alias-bg-layer-1,#fff);--dsw-alias-bg-fill-neutral:var(--dsw-static-neutral-bluish-100,#eef0f4);--dsw-alias-bg-fill-business:var(--dsw-alias-state-business-primary,#4d6bfe);--dsw-alias-bg-fill-success:var(--dsw-alias-state-success-primary,#12a150);--dsw-alias-bg-fill-warning:var(--dsw-alias-state-warn-primary,#e08700);--dsw-alias-bg-fill-danger:var(--dsw-alias-state-error-primary,#e5484d);--dsw-alias-state-success:var(--dsw-alias-state-success-primary,#12a150);--dsw-alias-state-warning:var(--dsw-alias-state-warn-primary,#e08700);--dsw-alias-state-danger:var(--dsw-alias-state-error-primary,#e5484d);--dsw-alias-label-on-fill:var(--dsw-alias-label-primary-inverted,#fff)}.i6pDkq_badge{top:var(--agent-teams-panel-top);right:var(--agent-teams-panel-right);z-index:2147483000;box-sizing:border-box;border:1px solid var(--dsw-alias-line-normal);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 92%, transparent);backdrop-filter:blur(16px);height:34px;box-shadow:0 8px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:999px;align-items:center;gap:7px;padding:0 12px;font-size:12px;font-weight:600;line-height:20px;transition:border-color .15s,transform .12s;display:inline-flex;position:fixed}.i6pDkq_badge:hover{border-color:var(--dsw-alias-line-strong);transform:translateY(-1px)}.i6pDkq_badge:active{transform:translateY(0)scale(.98)}.i6pDkq_badge:focus-visible,.i6pDkq_closeButton:focus-visible,.i6pDkq_memberRow:focus-visible,.i6pDkq_membersToggle:focus-visible,.i6pDkq_sectionToggleTitle:focus-visible,.i6pDkq_dagNode:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.i6pDkq_badgeDot,.i6pDkq_panelDot{background:var(--dsw-alias-label-tertiary);border-radius:50%;width:7px;height:7px}.i6pDkq_badgeDot[data-busy=true],.i6pDkq_panelDot[data-busy=true]{background:var(--dsw-alias-state-business-primary);animation:1.25s ease-in-out infinite i6pDkq_agentTeamsPulse}.i6pDkq_badgeCount,.i6pDkq_memberCount,.i6pDkq_teamStats,.i6pDkq_stageLabel,.i6pDkq_taskId{font-variant-numeric:tabular-nums}.i6pDkq_panel{top:var(--agent-teams-panel-top);right:var(--agent-teams-panel-right);z-index:2147483000;width:min(var(--agent-teams-panel-width), calc(100vw - 24px));min-height:min(var(--agent-teams-panel-min-height), calc(100dvh - var(--agent-teams-panel-top) - var(--agent-teams-panel-bottom-gap)));max-height:calc(100dvh - var(--agent-teams-panel-top) - var(--agent-teams-panel-bottom-gap));box-sizing:border-box;border:1px solid color-mix(in srgb, var(--dsw-alias-line-strong) 58%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module) 95%, transparent);backdrop-filter:blur(20px)saturate(1.08);box-shadow:0 12px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent), 0 32px 72px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent);border-radius:16px;flex-direction:column;animation:.18s ease-out i6pDkq_agentTeamsPanelIn;display:flex;position:fixed;overflow:hidden}@keyframes i6pDkq_agentTeamsPanelIn{0%{opacity:0;transform:translateY(-6px)scale(.99)}to{opacity:1;transform:translateY(0)scale(1)}}@keyframes i6pDkq_agentTeamsPulse{0%,to{opacity:.42}50%{opacity:1}}.i6pDkq_panelHead{border-bottom:1px solid var(--dsw-alias-line-normal);flex:none;justify-content:space-between;align-items:center;min-height:44px;padding:0 14px 0 16px;display:flex}.i6pDkq_panelTitle{color:var(--dsw-alias-label-primary);align-items:center;gap:8px;font-size:14px;font-weight:600;line-height:20px;display:inline-flex}.i6pDkq_panelActions{align-items:center;gap:6px;display:inline-flex}.i6pDkq_surfaceTabs{background:var(--dsw-alias-bg-fill-neutral);border-radius:7px;flex:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin:8px 12px;padding:3px;display:grid}.i6pDkq_surfaceTabs button{min-height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:5px;font-size:12px}.i6pDkq_surfaceTabs button[aria-selected=true]{background:var(--dsw-alias-bg-module);box-shadow:0 1px 3px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);color:var(--dsw-alias-label-primary);font-weight:600}.i6pDkq_toolSurface{min-height:0;overflow-y:auto}.i6pDkq_closeButton{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:7px;justify-content:center;align-items:center;padding:0;transition:background-color .12s,color .12s,transform .12s;display:inline-flex}.i6pDkq_closeButton:hover{background:var(--dsw-alias-bg-fill-neutral);color:var(--dsw-alias-label-primary)}.i6pDkq_closeButton:active{transform:scale(.94)}.i6pDkq_teams{overscroll-behavior:contain;scrollbar-width:none;flex-direction:column;min-height:0;display:flex;overflow-y:auto}.i6pDkq_teams::-webkit-scrollbar{display:none}.i6pDkq_teamChat{border-top:1px solid var(--dsw-alias-line-normal);flex-direction:column;gap:8px;margin:12px 14px 16px;padding-top:12px;display:flex}.i6pDkq_teamChatHead,.i6pDkq_teamChatMeta{align-items:center;gap:7px;display:flex}.i6pDkq_teamChatHead{color:var(--dsw-alias-label-primary);justify-content:space-between;font-size:12px;font-weight:600}.i6pDkq_teamChatHead>span:last-child,.i6pDkq_teamChatMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:400}.i6pDkq_teamChatEmpty{color:var(--dsw-alias-label-tertiary);font-size:12px}.i6pDkq_teamChatList{flex-direction:column;gap:9px;margin:0;padding:0;list-style:none;display:flex}.i6pDkq_teamChatMessage{flex-direction:column;gap:3px;min-width:0;display:flex}.i6pDkq_teamChatMeta strong{color:var(--dsw-alias-label-secondary);font-weight:600}.i6pDkq_teamChatMeta span:nth-child(2){color:var(--dsw-alias-state-business-primary)}.i6pDkq_teamChatMessage[data-kind=summary] .i6pDkq_teamChatMeta span:nth-child(2){color:var(--dsw-alias-state-success)}.i6pDkq_teamChatContent{overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.i6pDkq_team{border:1px solid color-mix(in srgb, var(--dsw-alias-line-strong) 52%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module) 96%, var(--dsw-alias-bg-fill-neutral));box-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);border-radius:8px;flex-direction:column;gap:12px;margin:0 8px;padding:12px 12px 16px;display:flex;position:relative}.i6pDkq_teamDivider{min-height:30px;color:var(--dsw-alias-label-tertiary);letter-spacing:0;align-items:center;gap:8px;margin:8px;font-size:10px;font-weight:700;line-height:16px;display:flex}.i6pDkq_teamDivider:before,.i6pDkq_teamDivider:after{content:"";background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 38%, var(--dsw-alias-line-strong));flex:1;height:2px}.i6pDkq_teamDivider span{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, var(--dsw-alias-line-strong));background:color-mix(in srgb, var(--dsw-alias-bg-fill-neutral) 74%, var(--dsw-alias-bg-module));border-radius:4px;padding:2px 7px}.i6pDkq_teamHead{align-items:center;gap:10px;min-width:0;display:flex}.i6pDkq_teamTabs{border:1px solid var(--dsw-alias-line-normal);background:color-mix(in srgb, var(--dsw-alias-bg-fill-neutral) 76%, transparent);border-radius:5px;grid-template-columns:repeat(3,minmax(0,1fr));align-self:flex-start;gap:2px;width:min(100%,252px);margin:-2px 0 0;padding:2px;display:grid}.i6pDkq_teamTabs button{min-width:0;min-height:22px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:3px;justify-content:center;align-items:center;gap:3px;font-size:10px;line-height:14px;display:inline-flex}.i6pDkq_teamTabs button[aria-selected=true]{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, var(--dsw-alias-line-normal));background:color-mix(in srgb, var(--dsw-alias-bg-module) 92%, var(--dsw-alias-state-business-primary));color:var(--dsw-alias-label-primary);font-weight:600}.i6pDkq_teamTabs button span{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:8px}.i6pDkq_chatSurface,.i6pDkq_artifactsSurface{border:1px solid var(--dsw-alias-line-normal);background:color-mix(in srgb, var(--dsw-alias-bg-module) 92%, var(--dsw-alias-bg-fill-neutral));border-radius:8px;flex-direction:column;min-height:230px;display:flex;overflow:hidden}.i6pDkq_chatSurfaceHead,.i6pDkq_artifactHead{border-bottom:1px solid var(--dsw-alias-line-normal);justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;display:flex}.i6pDkq_chatSurfaceHead strong,.i6pDkq_chatSurfaceHead span,.i6pDkq_artifactHead strong,.i6pDkq_artifactHead span{display:block}.i6pDkq_chatSurfaceHead strong,.i6pDkq_artifactHead strong{font-size:11px;line-height:16px}.i6pDkq_chatSurfaceHead span,.i6pDkq_artifactHead span{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.i6pDkq_chatIconButton{width:24px;height:24px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:center;align-items:center;padding:0;display:inline-flex}.i6pDkq_chatIconButton:hover{background:var(--dsw-alias-bg-fill-neutral);color:var(--dsw-alias-label-primary)}.i6pDkq_chatNotice{border-bottom:1px solid var(--dsw-alias-line-normal);color:var(--dsw-alias-label-tertiary);align-items:center;gap:5px;padding:6px 10px;font-size:9px;line-height:14px;display:flex}.i6pDkq_chatLoading,.i6pDkq_chatError{color:var(--dsw-alias-label-tertiary);padding:6px 10px;font-size:9px;line-height:14px}.i6pDkq_chatError{color:var(--dsw-alias-state-warning)}.i6pDkq_chatEmpty,.i6pDkq_artifactEmpty{min-height:150px;color:var(--dsw-alias-label-tertiary);place-items:center;padding:12px;font-size:10px;display:grid}.i6pDkq_chatList{flex-direction:column;gap:12px;margin:0;padding:12px 10px 14px;list-style:none;display:flex;overflow-y:auto}.i6pDkq_chatRow{min-width:0}.i6pDkq_chatMessageBody{align-items:flex-start;gap:7px;display:flex}.i6pDkq_chatAvatar{background:var(--dsw-alias-bg-fill-neutral);width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:7px;flex:none;place-items:center;font-size:11px;font-weight:600;display:grid;overflow:hidden}.i6pDkq_chatAvatar img{object-fit:cover;width:100%;height:100%}.i6pDkq_chatMessageMain{min-width:0;max-width:calc(100% - 36px)}.i6pDkq_chatAuthor{min-width:0;color:var(--dsw-alias-label-tertiary);align-items:baseline;gap:5px;margin-bottom:3px;font-size:9px;line-height:14px;display:flex}.i6pDkq_chatAuthor strong{color:var(--dsw-alias-label-primary);font-size:10px}.i6pDkq_chatAuthor time{font-variant-numeric:tabular-nums;margin-left:auto}.i6pDkq_chatBubble{border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module);max-width:100%;color:var(--dsw-alias-label-secondary);font:inherit;text-align:left;overflow-wrap:anywhere;cursor:pointer;border-radius:3px 9px 9px;flex-direction:column;gap:3px;padding:7px 9px;font-size:10px;line-height:16px;display:inline-flex}.i6pDkq_chatBubble:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module) 88%, var(--dsw-alias-bg-fill-neutral))}.i6pDkq_chatBubble:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.i6pDkq_chatBubble[data-kind=objection]{border-color:color-mix(in srgb, var(--dsw-alias-state-danger) 45%, var(--dsw-alias-line-normal))}.i6pDkq_chatBubble[data-kind=decision],.i6pDkq_chatBubble[data-kind=summary]{border-color:color-mix(in srgb, var(--dsw-alias-state-success) 45%, var(--dsw-alias-line-normal))}.i6pDkq_chatBubble[data-kind=tool],.i6pDkq_chatBubble[data-kind=artifact]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-line-normal))}.i6pDkq_chatKind{color:var(--dsw-alias-label-tertiary);font-size:8px;line-height:11px}.i6pDkq_chatReply{color:var(--dsw-alias-label-tertiary);margin-bottom:3px;font-size:8px;line-height:12px}.i6pDkq_chatTaskTag{background:var(--dsw-alias-bg-fill-neutral);max-width:100%;color:var(--dsw-alias-state-business-primary);border-radius:4px;align-self:flex-start;align-items:center;gap:4px;padding:2px 5px;font-size:8px;display:inline-flex}.i6pDkq_chatTaskTag span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.i6pDkq_chatInlineMentions{color:var(--dsw-alias-state-business-primary);font-weight:600}.i6pDkq_chatDetails{border-left:2px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 42%, var(--dsw-alias-line-normal));background:color-mix(in srgb, var(--dsw-alias-bg-fill-neutral) 72%, transparent);color:var(--dsw-alias-label-tertiary);flex-direction:column;gap:3px;margin-top:5px;padding:6px 8px;font-size:8px;line-height:13px;display:flex}.i6pDkq_chatDetails button{color:var(--dsw-alias-state-business-primary);font:inherit;cursor:pointer;background:0 0;border:0;align-self:flex-start;padding:0;font-size:8px}.i6pDkq_chatSystemEvent{color:var(--dsw-alias-label-tertiary);text-align:center;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 6px;font-size:9px;line-height:14px;display:flex}.i6pDkq_chatSystemEvent span:first-child{background:var(--dsw-alias-bg-fill-neutral);border-radius:4px;padding:1px 5px}.i6pDkq_chatSystemEvent time{font-variant-numeric:tabular-nums}.i6pDkq_artifactList{gap:7px;margin:0;padding:10px;list-style:none;display:grid}.i6pDkq_artifactCard{border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module);border-radius:7px;justify-content:space-between;align-items:center;gap:8px;min-width:0;padding:8px;display:flex}.i6pDkq_artifactCard>div{min-width:0}.i6pDkq_artifactCard strong,.i6pDkq_artifactCard span{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.i6pDkq_artifactCard strong{color:var(--dsw-alias-label-primary);font-size:10px;line-height:15px}.i6pDkq_artifactCard span{color:var(--dsw-alias-label-tertiary);font-size:8px;line-height:13px}.i6pDkq_artifactDownload{width:25px;height:25px;color:var(--dsw-alias-state-business-primary);border-radius:5px;flex:none;justify-content:center;align-items:center;display:inline-flex}.i6pDkq_artifactDownload:hover{background:var(--dsw-alias-bg-fill-neutral)}.i6pDkq_sessionArtifactDownload{color:var(--dsw-alias-state-business-primary);text-underline-offset:2px;cursor:pointer;text-decoration:underline 1px}.i6pDkq_sessionArtifactDownload:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.i6pDkq_teamName{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;font-weight:600;line-height:18px;overflow:hidden}.i6pDkq_teamStats{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;gap:8px;font-size:10.5px;line-height:16px;display:inline-flex}.i6pDkq_sectionHead{justify-content:space-between;align-items:center;gap:8px;min-width:0;display:flex}.i6pDkq_sectionTitle{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:11px;font-weight:600;line-height:16px;display:inline-flex}.i6pDkq_sectionHint{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:14px;overflow:hidden}.i6pDkq_delegationSection{flex-direction:column;gap:12px;min-width:0;display:flex}.i6pDkq_hierarchySection{border:1px solid color-mix(in srgb, var(--dsw-alias-line-strong) 78%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 72%, var(--dsw-alias-bg-fill-neutral));border-radius:9px;flex-direction:column;gap:8px;min-width:0;padding:12px 10px 10px;display:flex;position:relative}.i6pDkq_hierarchySection[data-section=captain]{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 38%, var(--dsw-alias-line-strong));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 5%, var(--dsw-alias-bg-module))}.i6pDkq_hierarchyLabel{background:var(--dsw-alias-bg-module);color:var(--dsw-alias-label-tertiary);letter-spacing:0;padding:0 5px;font-size:9px;font-weight:700;line-height:16px;position:absolute;top:-8px;left:9px}.i6pDkq_captainNode{box-sizing:border-box;border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, var(--dsw-alias-line-normal));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-module));border-radius:10px;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;min-height:48px;padding:8px 10px;display:grid}.i6pDkq_captainAvatar,.i6pDkq_memberAvatar{flex:none;justify-content:center;align-items:center;display:inline-flex;position:relative}.i6pDkq_captainAvatar{width:36px;height:36px}.i6pDkq_leadAvatar,.i6pDkq_memberArt,.i6pDkq_memberInitial{box-sizing:border-box;border:1px solid var(--dsw-alias-line-strong);object-fit:cover;background:#0b1d33;border-radius:50%;width:34px;height:34px}.i6pDkq_captainInfo,.i6pDkq_memberInfo{flex-direction:column;min-width:max-content;display:flex}.i6pDkq_captainInfo{gap:2px}.i6pDkq_captainLine,.i6pDkq_memberLine{align-items:center;gap:6px;min-width:0;display:flex}.i6pDkq_captainName,.i6pDkq_memberName{color:var(--dsw-alias-label-primary);white-space:nowrap;font-size:12.5px;font-weight:600;line-height:18px;overflow:visible}.i6pDkq_captainRole,.i6pDkq_memberRole{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:14px;overflow:hidden}.i6pDkq_captainSummary,.i6pDkq_memberStatusLine{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;line-height:15px;overflow:hidden}.i6pDkq_captainStartedAt{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:9.5px;line-height:14px}.i6pDkq_captainState,.i6pDkq_memberState{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;align-items:center;gap:5px;font-size:10px;font-weight:500;line-height:15px;display:inline-flex}.i6pDkq_captainState[data-busy=true],.i6pDkq_memberState[data-activity=working]{color:var(--dsw-alias-state-business-primary)}.i6pDkq_workGlyph rect{opacity:.5}.i6pDkq_workGlyph[data-active=true] rect{animation:1.1s ease-in-out infinite i6pDkq_agentTeamsDot}@keyframes i6pDkq_agentTeamsDot{0%,to{opacity:.25}50%{opacity:1}}.i6pDkq_progressOverview{flex-direction:column;gap:7px;display:flex}.i6pDkq_progressTitle{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;line-height:16px}.i6pDkq_progressSegments{gap:3px;display:flex}.i6pDkq_progressSegments>span,.i6pDkq_progressEmpty{background:var(--dsw-alias-line-strong);border-radius:2px;flex:1;height:5px}.i6pDkq_progressEmpty{width:100%;display:block}.i6pDkq_progressSegments>span[data-state=running]{background:var(--dsw-alias-state-business-primary)}.i6pDkq_progressSegments>span[data-state=blocked]{background:var(--dsw-alias-state-warning)}.i6pDkq_progressSegments>span[data-state=completed]{background:var(--dsw-alias-state-success)}.i6pDkq_progressSegments>span[data-state=failed]{background:var(--dsw-alias-state-danger)}.i6pDkq_progressSegments>span[data-state=cancelled]{opacity:.55}.i6pDkq_progressLegend{color:var(--dsw-alias-label-tertiary);gap:10px;font-size:9.5px;line-height:14px;display:flex}.i6pDkq_progressLegend>span[data-state=running]{color:var(--dsw-alias-state-business-primary)}.i6pDkq_progressLegend>span[data-state=blocked]{color:var(--dsw-alias-state-warning)}.i6pDkq_progressLegend>span[data-state=completed]{color:var(--dsw-alias-state-success)}.i6pDkq_progressSummary{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-module));min-width:0;color:var(--dsw-alias-label-secondary);border-radius:8px;align-items:center;gap:6px;padding:5px 8px;font-size:10px;font-weight:600;line-height:15px;display:flex}.i6pDkq_progressSummary[data-state=warning]{background:color-mix(in srgb, var(--dsw-alias-state-warning) 8%, var(--dsw-alias-bg-module))}.i6pDkq_progressSummary[data-state=completed]{background:color-mix(in srgb, var(--dsw-alias-state-success) 8%, var(--dsw-alias-bg-module))}.i6pDkq_progressSummary>span:last-child{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.i6pDkq_progressSummaryDot{background:var(--dsw-alias-state-business-primary);border-radius:50%;flex:none;width:5px;height:5px}.i6pDkq_progressSummary[data-state=warning] .i6pDkq_progressSummaryDot{background:var(--dsw-alias-state-warning)}.i6pDkq_progressSummary[data-state=completed] .i6pDkq_progressSummaryDot{background:var(--dsw-alias-state-success)}.i6pDkq_membersToggle{background:var(--dsw-alias-bg-module-platform);width:100%;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border:0;border-radius:8px;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:10.5px;font-weight:600;line-height:15px;display:flex}.i6pDkq_membersToggle:hover{background:var(--dsw-alias-bg-fill-neutral)}.i6pDkq_membersToggle>span{align-items:center;gap:5px;display:inline-flex}.i6pDkq_membersToggle>span:last-child{color:var(--dsw-alias-state-business-primary)}.i6pDkq_chevron{flex:none;transition:transform .14s}.i6pDkq_chevron[data-open=true]{transform:rotate(90deg)}.i6pDkq_delegationTree{flex-direction:column;gap:2px;margin-left:18px;padding:9px 0 0 20px;display:flex;position:relative}.i6pDkq_delegationTree:before{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 64%, var(--dsw-alias-line-strong));width:2px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-bg-module) 55%, transparent);content:"";border-radius:2px;position:absolute;top:0;bottom:22px;left:0}.i6pDkq_memberBlock{flex-direction:column;min-width:0;padding:3px 0 7px;display:flex;position:relative}.i6pDkq_memberBranch{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 64%, var(--dsw-alias-line-strong));border-radius:2px;width:20px;height:2px;display:block;position:absolute;top:23px;right:100%}.i6pDkq_memberBranch:before{box-sizing:border-box;border:1px solid var(--dsw-alias-bg-module);background:var(--dsw-alias-state-business-primary);content:"";border-radius:50%;width:7px;height:7px;position:absolute;top:-3px;right:-1px}.i6pDkq_memberRow{box-sizing:border-box;width:100%;min-width:0;min-height:44px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:8px;grid-template-columns:38px max-content minmax(0,1fr) auto;align-items:center;gap:8px;padding:4px 6px;transition:background-color .12s,transform .12s;display:grid}.i6pDkq_memberRow:hover,.i6pDkq_memberRow[data-activity=working]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, var(--dsw-alias-bg-module))}.i6pDkq_memberRow:active{transform:scale(.995)}.i6pDkq_memberAvatar{width:34px;height:34px}.i6pDkq_memberAvatar[data-unread=true]:after{border:1px solid var(--dsw-alias-state-business-primary);content:"";border-radius:50%;animation:1.5s ease-out infinite i6pDkq_agentTeamsRing;position:absolute;inset:-3px}@keyframes i6pDkq_agentTeamsRing{0%{opacity:.82;transform:scale(.94)}75%,to{opacity:0;transform:scale(1.18)}}.i6pDkq_memberInitial{color:var(--dsw-alias-label-on-fill);justify-content:center;align-items:center;font-size:14px;font-weight:600;line-height:20px;display:inline-flex}.i6pDkq_stateArt{box-sizing:border-box;border:2px solid var(--dsw-alias-bg-module);object-fit:cover;background:#0b1d33;border-radius:50%;width:19px;height:19px;position:absolute;bottom:-4px;right:-4px}.i6pDkq_stateArt[data-activity=working]{animation:2.4s ease-in-out infinite i6pDkq_agentTeamsFloat}.i6pDkq_stateArt[data-activity=idle]{animation:4.2s ease-in-out infinite i6pDkq_agentTeamsBreathe}.i6pDkq_stateArt[data-activity=unknown]{animation:2.8s ease-in-out infinite i6pDkq_agentTeamsThink}@keyframes i6pDkq_agentTeamsFloat{0%,to{transform:translateY(0)rotate(-4deg)}50%{transform:translateY(-2px)rotate(4deg)}}@keyframes i6pDkq_agentTeamsBreathe{0%,to{opacity:.82;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}@keyframes i6pDkq_agentTeamsThink{0%,to{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}.i6pDkq_memberState{margin-left:auto}.i6pDkq_memberCount{color:var(--dsw-alias-label-tertiary);font-size:10.5px;line-height:16px}.i6pDkq_memberToolTrace{scrollbar-width:thin;white-space:nowrap;align-items:center;gap:4px;min-width:0;max-width:100%;padding:5px 4px 2px 0;display:inline-flex;overflow:auto hidden}.i6pDkq_memberToolTag{box-sizing:border-box;border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, var(--dsw-alias-line-normal));background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, var(--dsw-alias-bg-module));width:24px;height:22px;color:var(--dsw-alias-state-business-primary);border-radius:5px;flex:0 0 24px;justify-content:center;align-items:center;gap:2px;display:inline-flex;position:relative}.i6pDkq_memberToolTag[data-failed=true]{border-color:color-mix(in srgb, var(--dsw-alias-state-warning) 58%, var(--dsw-alias-line-normal));background:color-mix(in srgb, var(--dsw-alias-state-warning) 10%, var(--dsw-alias-bg-module));color:var(--dsw-alias-state-warning)}.i6pDkq_memberToolCount{border:1px solid var(--dsw-alias-bg-module);background:var(--dsw-alias-state-business-primary);min-width:11px;height:11px;color:var(--dsw-alias-label-on-fill);text-align:center;border-radius:999px;padding:0 2px;font-size:8px;font-weight:700;line-height:10px;position:absolute;top:-5px;right:-4px}.i6pDkq_memberToolTag[data-failed=true] .i6pDkq_memberToolCount{background:var(--dsw-alias-state-warning)}.i6pDkq_memberToolFailure{background:var(--dsw-alias-bg-module);color:var(--dsw-alias-state-danger);border-radius:50%;padding:1px;position:absolute;bottom:-5px;right:-5px}.i6pDkq_assignmentLine{align-items:center;gap:7px;min-width:0;padding:0 6px 0 52px;display:flex}.i6pDkq_assignmentLabel{color:var(--dsw-alias-label-tertiary);flex:none;font-size:9.5px;line-height:14px}.i6pDkq_assignmentTasks{flex-wrap:wrap;flex:1;gap:4px;min-width:0;display:flex}.i6pDkq_assignmentChip{background:var(--dsw-alias-bg-fill-neutral);min-height:16px;color:var(--dsw-alias-label-secondary);border-radius:4px;align-items:center;padding:0 5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;font-weight:600;line-height:14px;display:inline-flex}.i6pDkq_assignmentChip[data-state=running]{background:var(--dsw-alias-bg-fill-business);color:var(--dsw-alias-label-on-fill)}.i6pDkq_assignmentChip[data-state=completed]{background:var(--dsw-alias-bg-fill-success);color:var(--dsw-alias-label-on-fill)}.i6pDkq_assignmentChip[data-state=blocked]{background:var(--dsw-alias-bg-fill-warning);color:var(--dsw-alias-label-on-fill)}.i6pDkq_assignmentChip[data-state=failed]{background:var(--dsw-alias-bg-fill-danger);color:var(--dsw-alias-label-on-fill)}.i6pDkq_assignmentChip[data-state=cancelled]{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}.i6pDkq_unreadPill{color:var(--dsw-alias-state-business-primary);white-space:nowrap;flex:none;font-size:9.5px;font-weight:600;line-height:14px}.i6pDkq_taskEmpty{color:var(--dsw-alias-label-tertiary);font-size:9.5px;line-height:14px}.i6pDkq_dependencySection{border-top:1px solid var(--dsw-alias-line-normal);flex-direction:column;gap:7px;min-width:0;padding-top:10px;display:flex}.i6pDkq_sectionToggleTitle{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:0;align-items:center;gap:6px;padding:0;font-size:11px;font-weight:600;line-height:16px;display:inline-flex}.i6pDkq_dagViewport{scrollbar-width:thin;min-width:0;padding:2px 0 4px;overflow-x:auto}.i6pDkq_dagCanvas{min-width:100%;position:relative}.i6pDkq_dagCanvas[data-layout=parallel]{flex-wrap:wrap;gap:8px;display:flex}.i6pDkq_dagCanvas[data-layout=parallel] .i6pDkq_dagNode{flex:92px;min-width:92px;position:relative}.i6pDkq_dagEdges{pointer-events:none;position:absolute;inset:0;overflow:visible}.i6pDkq_dagEdges path{fill:none;stroke:var(--dsw-alias-line-strong);stroke-width:1px;transition:opacity .14s,stroke .14s,stroke-width .14s}.i6pDkq_dagEdges path[data-active=true]{stroke:var(--dsw-alias-state-business-primary);stroke-width:1.6px}.i6pDkq_dagEdges path[data-dimmed=true]{opacity:.24}.i6pDkq_dagNode{box-sizing:border-box;border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;border-radius:6px;flex-direction:column;justify-content:center;gap:1px;padding:0 6px;transition:border-color .14s,background-color .14s,opacity .14s;display:flex;position:absolute}.i6pDkq_dagNode:hover,.i6pDkq_dagNode[data-focused=true]{border-color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, var(--dsw-alias-bg-module))}.i6pDkq_dagNode[data-dimmed=true]{opacity:.3}.i6pDkq_dagNode[data-state=running][data-dimmed=true]{opacity:.58}.i6pDkq_dagNode[data-state=completed]{border-color:color-mix(in srgb, var(--dsw-alias-state-success) 48%, var(--dsw-alias-line-normal))}.i6pDkq_dagNode[data-state=blocked]{border-color:color-mix(in srgb, var(--dsw-alias-state-warning) 52%, var(--dsw-alias-line-normal))}.i6pDkq_dagNode[data-state=failed]{border-color:color-mix(in srgb, var(--dsw-alias-state-danger) 56%, var(--dsw-alias-line-normal))}.i6pDkq_dagNodeHead{color:var(--dsw-alias-label-primary);align-items:center;gap:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9.5px;font-weight:700;display:flex}.i6pDkq_dagNodeDot{background:var(--dsw-alias-line-strong);border-radius:1.5px;flex:none;width:5px;height:5px}.i6pDkq_dagNode[data-state=running] .i6pDkq_dagNodeDot{background:var(--dsw-alias-state-business-primary)}.i6pDkq_dagNode[data-state=running] .i6pDkq_dagNodeHead{padding-right:12px}.i6pDkq_dagRunningState{width:9px;height:9px;color:var(--dsw-alias-state-business-primary);pointer-events:none;justify-content:center;align-items:center;display:inline-flex;position:absolute;top:4px;right:5px}.i6pDkq_dagRunningState .i6pDkq_workGlyph{width:9px;height:9px}.i6pDkq_dagNode[data-state=blocked] .i6pDkq_dagNodeDot{background:var(--dsw-alias-state-warning)}.i6pDkq_dagNode[data-state=completed] .i6pDkq_dagNodeDot{background:var(--dsw-alias-state-success)}.i6pDkq_dagNode[data-state=failed] .i6pDkq_dagNodeDot{background:var(--dsw-alias-state-danger)}.i6pDkq_dagNodeLabel{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:8.5px;line-height:11px;overflow:hidden}.i6pDkq_taskDetail{border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module-platform);border-radius:9px;flex-direction:column;gap:3px;min-width:0;padding:7px 9px;display:flex}.i6pDkq_taskDetailHead{align-items:center;gap:6px;min-width:0;display:flex}.i6pDkq_taskDetailId{color:var(--dsw-alias-state-business-primary);flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700}.i6pDkq_taskDetailSubject{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:600;line-height:16px;overflow:hidden}.i6pDkq_taskDetailBadge{background:var(--dsw-alias-bg-fill-neutral);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;padding:0 5px;font-size:8.5px;font-weight:600;line-height:14px}.i6pDkq_taskDetailBadge[data-state=running]{background:var(--dsw-alias-bg-fill-business);color:var(--dsw-alias-label-on-fill)}.i6pDkq_taskDetailBadge[data-state=blocked]{background:var(--dsw-alias-bg-fill-warning);color:var(--dsw-alias-label-on-fill)}.i6pDkq_taskDetailBadge[data-state=completed]{background:var(--dsw-alias-bg-fill-success);color:var(--dsw-alias-label-on-fill)}.i6pDkq_taskDetailBadge[data-state=failed]{background:var(--dsw-alias-bg-fill-danger);color:var(--dsw-alias-label-on-fill)}.i6pDkq_taskDetailLine,.i6pDkq_taskDetailMeta{color:var(--dsw-alias-label-secondary);font-size:9.5px;line-height:14px}.i6pDkq_taskDetailMeta{color:var(--dsw-alias-label-tertiary)}.i6pDkq_taskTimes{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex-wrap:wrap;gap:3px 10px;margin-top:3px;font-size:9.5px;line-height:14px;display:flex}.i6pDkq_taskOutput{border-left:2px solid var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-bg-fill-neutral) 72%, transparent);flex-direction:column;gap:3px;min-width:0;margin-top:5px;padding:7px 8px;display:flex}.i6pDkq_taskOutputLabel{color:var(--dsw-alias-label-secondary);font-size:9.5px;font-weight:600;line-height:14px}.i6pDkq_taskOutputText{max-height:220px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere;font-size:9.5px;line-height:15px;overflow:auto}.i6pDkq_taskArtifacts{flex-wrap:wrap;align-items:center;gap:5px;min-width:0;margin-top:5px;display:flex}.i6pDkq_taskArtifactsLabel{color:var(--dsw-alias-label-tertiary);flex:none;font-size:9.5px}.i6pDkq_taskArtifactLink{background:var(--dsw-alias-bg-fill-business);min-width:0;max-width:100%;color:var(--dsw-alias-label-on-fill);text-overflow:ellipsis;white-space:nowrap;border-radius:4px;padding:2px 6px;font-size:9.5px;line-height:14px;text-decoration:none;overflow:hidden}.i6pDkq_taskArtifactLink:hover{filter:brightness(.95);text-decoration:underline}.i6pDkq_emptyHint{color:var(--dsw-alias-label-tertiary);padding:10px 12px;font-size:11px;line-height:16px}.i6pDkq_historicPill{background:var(--dsw-alias-bg-fill-neutral);color:var(--dsw-alias-label-tertiary);border-radius:4px;flex:none;margin-left:auto;padding:1px 7px;font-size:9.5px;font-weight:600;line-height:15px}.i6pDkq_members{flex-direction:column;gap:3px;display:flex}.i6pDkq_archivedWrap:before{color:var(--dsw-alias-label-tertiary);content:"已结束 · 历史归档";padding:5px 14px 0;font-size:9.5px;font-weight:600;line-height:14px;display:block}@media (prefers-reduced-motion:reduce){[data-phase=active],.i6pDkq_panel,.i6pDkq_badge,.i6pDkq_badgeDot,.i6pDkq_panelDot,.i6pDkq_workGlyph rect,.i6pDkq_stateArt,.i6pDkq_memberAvatar[data-unread=true]:after{transition:none;animation:none}}@media (width<=960px){html{--agent-teams-main-shift:0px}html[data-agent-teams-panel-open] [data-phase=active]{padding-right:0}}@media (width<=640px){html{--agent-teams-panel-right:calc(10px + var(--dsh-sidebar-width,0px));--agent-teams-panel-top:56px;--agent-teams-panel-bottom-gap:56px}.i6pDkq_panel{width:auto;left:10px}.i6pDkq_teamStats span[data-stat=messages]{display:none}.i6pDkq_captainNode{grid-template-columns:38px minmax(0,1fr)}.i6pDkq_captainState{display:none}.i6pDkq_delegationTree{margin-left:12px;padding-left:15px}.i6pDkq_memberBranch{width:15px}.i6pDkq_assignmentLine{padding-left:45px}}';
  document.head.appendChild(tag);
}
var ActivityPanel_default = { "agentTeamsBreathe": "i6pDkq_agentTeamsBreathe", "agentTeamsDot": "i6pDkq_agentTeamsDot", "agentTeamsFloat": "i6pDkq_agentTeamsFloat", "agentTeamsPanelIn": "i6pDkq_agentTeamsPanelIn", "agentTeamsPulse": "i6pDkq_agentTeamsPulse", "agentTeamsRing": "i6pDkq_agentTeamsRing", "agentTeamsThink": "i6pDkq_agentTeamsThink", "archivedWrap": "i6pDkq_archivedWrap", "artifactCard": "i6pDkq_artifactCard", "artifactDownload": "i6pDkq_artifactDownload", "artifactEmpty": "i6pDkq_artifactEmpty", "artifactHead": "i6pDkq_artifactHead", "artifactList": "i6pDkq_artifactList", "artifactsSurface": "i6pDkq_artifactsSurface", "assignmentChip": "i6pDkq_assignmentChip", "assignmentLabel": "i6pDkq_assignmentLabel", "assignmentLine": "i6pDkq_assignmentLine", "assignmentTasks": "i6pDkq_assignmentTasks", "badge": "i6pDkq_badge", "badgeCount": "i6pDkq_badgeCount", "badgeDot": "i6pDkq_badgeDot", "captainAvatar": "i6pDkq_captainAvatar", "captainInfo": "i6pDkq_captainInfo", "captainLine": "i6pDkq_captainLine", "captainName": "i6pDkq_captainName", "captainNode": "i6pDkq_captainNode", "captainRole": "i6pDkq_captainRole", "captainStartedAt": "i6pDkq_captainStartedAt", "captainState": "i6pDkq_captainState", "captainSummary": "i6pDkq_captainSummary", "chatAuthor": "i6pDkq_chatAuthor", "chatAvatar": "i6pDkq_chatAvatar", "chatBubble": "i6pDkq_chatBubble", "chatDetails": "i6pDkq_chatDetails", "chatEmpty": "i6pDkq_chatEmpty", "chatError": "i6pDkq_chatError", "chatIconButton": "i6pDkq_chatIconButton", "chatInlineMentions": "i6pDkq_chatInlineMentions", "chatKind": "i6pDkq_chatKind", "chatList": "i6pDkq_chatList", "chatLoading": "i6pDkq_chatLoading", "chatMessageBody": "i6pDkq_chatMessageBody", "chatMessageMain": "i6pDkq_chatMessageMain", "chatNotice": "i6pDkq_chatNotice", "chatReply": "i6pDkq_chatReply", "chatRow": "i6pDkq_chatRow", "chatSurface": "i6pDkq_chatSurface", "chatSurfaceHead": "i6pDkq_chatSurfaceHead", "chatSystemEvent": "i6pDkq_chatSystemEvent", "chatTaskTag": "i6pDkq_chatTaskTag", "chevron": "i6pDkq_chevron", "closeButton": "i6pDkq_closeButton", "dagCanvas": "i6pDkq_dagCanvas", "dagEdges": "i6pDkq_dagEdges", "dagNode": "i6pDkq_dagNode", "dagNodeDot": "i6pDkq_dagNodeDot", "dagNodeHead": "i6pDkq_dagNodeHead", "dagNodeLabel": "i6pDkq_dagNodeLabel", "dagRunningState": "i6pDkq_dagRunningState", "dagViewport": "i6pDkq_dagViewport", "delegationSection": "i6pDkq_delegationSection", "delegationTree": "i6pDkq_delegationTree", "dependencySection": "i6pDkq_dependencySection", "emptyHint": "i6pDkq_emptyHint", "hierarchyLabel": "i6pDkq_hierarchyLabel", "hierarchySection": "i6pDkq_hierarchySection", "historicPill": "i6pDkq_historicPill", "leadAvatar": "i6pDkq_leadAvatar", "memberArt": "i6pDkq_memberArt", "memberAvatar": "i6pDkq_memberAvatar", "memberBlock": "i6pDkq_memberBlock", "memberBranch": "i6pDkq_memberBranch", "memberCount": "i6pDkq_memberCount", "memberInfo": "i6pDkq_memberInfo", "memberInitial": "i6pDkq_memberInitial", "memberLine": "i6pDkq_memberLine", "memberName": "i6pDkq_memberName", "memberRole": "i6pDkq_memberRole", "memberRow": "i6pDkq_memberRow", "memberState": "i6pDkq_memberState", "memberStatusLine": "i6pDkq_memberStatusLine", "memberToolCount": "i6pDkq_memberToolCount", "memberToolFailure": "i6pDkq_memberToolFailure", "memberToolTag": "i6pDkq_memberToolTag", "memberToolTrace": "i6pDkq_memberToolTrace", "members": "i6pDkq_members", "membersToggle": "i6pDkq_membersToggle", "panel": "i6pDkq_panel", "panelActions": "i6pDkq_panelActions", "panelDot": "i6pDkq_panelDot", "panelHead": "i6pDkq_panelHead", "panelTitle": "i6pDkq_panelTitle", "progressEmpty": "i6pDkq_progressEmpty", "progressLegend": "i6pDkq_progressLegend", "progressOverview": "i6pDkq_progressOverview", "progressSegments": "i6pDkq_progressSegments", "progressSummary": "i6pDkq_progressSummary", "progressSummaryDot": "i6pDkq_progressSummaryDot", "progressTitle": "i6pDkq_progressTitle", "sectionHead": "i6pDkq_sectionHead", "sectionHint": "i6pDkq_sectionHint", "sectionTitle": "i6pDkq_sectionTitle", "sectionToggleTitle": "i6pDkq_sectionToggleTitle", "sessionArtifactDownload": "i6pDkq_sessionArtifactDownload", "stageLabel": "i6pDkq_stageLabel", "stateArt": "i6pDkq_stateArt", "surfaceTabs": "i6pDkq_surfaceTabs", "taskArtifactLink": "i6pDkq_taskArtifactLink", "taskArtifacts": "i6pDkq_taskArtifacts", "taskArtifactsLabel": "i6pDkq_taskArtifactsLabel", "taskDetail": "i6pDkq_taskDetail", "taskDetailBadge": "i6pDkq_taskDetailBadge", "taskDetailHead": "i6pDkq_taskDetailHead", "taskDetailId": "i6pDkq_taskDetailId", "taskDetailLine": "i6pDkq_taskDetailLine", "taskDetailMeta": "i6pDkq_taskDetailMeta", "taskDetailSubject": "i6pDkq_taskDetailSubject", "taskEmpty": "i6pDkq_taskEmpty", "taskId": "i6pDkq_taskId", "taskOutput": "i6pDkq_taskOutput", "taskOutputLabel": "i6pDkq_taskOutputLabel", "taskOutputText": "i6pDkq_taskOutputText", "taskTimes": "i6pDkq_taskTimes", "team": "i6pDkq_team", "teamChat": "i6pDkq_teamChat", "teamChatContent": "i6pDkq_teamChatContent", "teamChatEmpty": "i6pDkq_teamChatEmpty", "teamChatHead": "i6pDkq_teamChatHead", "teamChatList": "i6pDkq_teamChatList", "teamChatMessage": "i6pDkq_teamChatMessage", "teamChatMeta": "i6pDkq_teamChatMeta", "teamDivider": "i6pDkq_teamDivider", "teamHead": "i6pDkq_teamHead", "teamName": "i6pDkq_teamName", "teamStats": "i6pDkq_teamStats", "teamTabs": "i6pDkq_teamTabs", "teams": "i6pDkq_teams", "toolSurface": "i6pDkq_toolSurface", "unreadPill": "i6pDkq_unreadPill", "workGlyph": "i6pDkq_workGlyph" };

// packages/opc-profile/agent-teams-desktop/source/lib/client/TeamChatView.js
function timeLabel(value) {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
function roleOf(team, name) {
  if (name === "captain")
    return "组长";
  const role = team.members.find((member) => member.name === name)?.role?.trim() ?? "";
  return /\p{Script=Han}/u.test(role) ? role : "";
}
function avatarOf(team, name) {
  if (name === "captain")
    return LEAD_ART;
  const member = team.members.find((item) => item.name === name);
  return member === void 0 ? null : memberArtUrl(member.name, member.role);
}
function copyText(value) {
  void navigator.clipboard?.writeText(value);
}
function noteworthyKind(kind) {
  return kind === "objection" || kind === "decision" || kind === "summary" || kind === "approval";
}
function ChatMessage({ team, message }) {
  const avatar = avatarOf(team, message.from);
  const system = message.kind === "system";
  const [detailsOpen, setDetailsOpen] = (0, import_react3.useState)(false);
  const displayContent = message.displayContent ?? summarizeTeamChatContent(message.content, message.kind);
  const mentionNames = teamChatMentionNames(message);
  const task = message.taskId === void 0 ? void 0 : team.tasks.find((item) => item.id === message.taskId);
  return (0, import_jsx_runtime.jsx)("li", { className: ActivityPanel_default.chatRow, "data-kind": message.kind, "data-system": system, children: system ? (0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatSystemEvent, children: [(0, import_jsx_runtime.jsx)("span", { children: displayContent }), (0, import_jsx_runtime.jsx)("time", { children: timeLabel(message.ts) })] }) : (0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatMessageBody, children: [(0, import_jsx_runtime.jsx)("span", { className: ActivityPanel_default.chatAvatar, children: avatar ? (0, import_jsx_runtime.jsx)("img", { src: avatar, alt: "", "aria-hidden": true }) : (0, import_jsx_runtime.jsx)("span", { children: message.from.slice(0, 1).toUpperCase() }) }), (0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatMessageMain, children: [(0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatAuthor, children: [(0, import_jsx_runtime.jsx)("strong", { children: message.from === "captain" ? "组长" : message.from }), roleOf(team, message.from) !== "" && (0, import_jsx_runtime.jsx)("span", { children: roleOf(team, message.from) }), (0, import_jsx_runtime.jsx)("time", { children: timeLabel(message.ts) })] }), message.replyTo && (0, import_jsx_runtime.jsx)("div", { className: ActivityPanel_default.chatReply, children: "接着上一条说" }), (0, import_jsx_runtime.jsxs)("button", { type: "button", className: ActivityPanel_default.chatBubble, "data-kind": message.kind, "aria-expanded": detailsOpen, onClick: () => {
    setDetailsOpen((value) => !value);
  }, title: "查看协作详情", children: [noteworthyKind(message.kind) && (0, import_jsx_runtime.jsx)("span", { className: ActivityPanel_default.chatKind, children: teamChatMessageLabel(message.kind) }), (0, import_jsx_runtime.jsxs)("span", { children: [mentionNames.length > 0 && (0, import_jsx_runtime.jsxs)("span", { className: ActivityPanel_default.chatInlineMentions, children: [mentionNames.map((name) => `@${name}`).join(" "), " "] }), displayContent] }), message.taskId && (0, import_jsx_runtime.jsxs)("span", { className: ActivityPanel_default.chatTaskTag, children: [(0, import_jsx_runtime.jsx)("span", { children: message.taskId }), (0, import_jsx_runtime.jsx)(Copy, { size: 11 })] })] }), detailsOpen && (0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatDetails, "aria-label": "协作详情", children: [task !== void 0 && (0, import_jsx_runtime.jsxs)("span", { children: ["关联任务：", task.subject] }), (0, import_jsx_runtime.jsxs)("span", { children: ["当前环节：", teamChatMessageLabel(message.kind)] }), message.mergedIds !== void 0 && (0, import_jsx_runtime.jsxs)("span", { children: ["合并了 ", message.mergedIds.length, " 条进度同步"] }), message.taskId && (0, import_jsx_runtime.jsxs)("button", { type: "button", onClick: () => {
    copyText(message.taskId);
  }, title: "复制 Task ID", children: ["复制 ", message.taskId] })] })] })] }) });
}
function TeamChatView({ team, historic = false }) {
  const [messages, setMessages] = (0, import_react3.useState)(team.recentMessages ?? []);
  const [loading, setLoading] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)(null);
  const [refreshToken, setRefreshToken] = (0, import_react3.useState)(0);
  (0, import_react3.useEffect)(() => {
    let cancelled = false;
    if (historic || team.workspace === "") {
      setMessages(team.recentMessages ?? []);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        let cursor = 0;
        const loaded = [];
        let hasMore = true;
        while (hasMore && !cancelled) {
          const page = await loadTeamChatPage(team, cursor, 100);
          loaded.push(...page.messages);
          hasMore = page.hasMore;
          cursor = page.nextCursor === void 0 ? cursor : Number(page.nextCursor);
          if (!Number.isSafeInteger(cursor) || cursor < 0)
            break;
        }
        if (!cancelled)
          setMessages(loaded);
      } catch {
        if (!cancelled) {
          setMessages(team.recentMessages ?? []);
          setError("完整群聊暂时无法加载，当前显示最近动态");
        }
      } finally {
        if (!cancelled)
          setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [team.teamId, team.workspace, team.chatCursor, historic, refreshToken]);
  const uniqueMessages = (0, import_react3.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const message of messages)
      map.set(message.id, message);
    return mergeDisplayMessages([...map.values()].sort((left, right) => left.seq - right.seq));
  }, [messages]);
  return (0, import_jsx_runtime.jsxs)("section", { className: ActivityPanel_default.chatSurface, "aria-label": "AI 团队工作实况", "data-read-only-chat": true, children: [(0, import_jsx_runtime.jsxs)("header", { className: ActivityPanel_default.chatSurfaceHead, children: [(0, import_jsx_runtime.jsxs)("div", { children: [(0, import_jsx_runtime.jsx)("strong", { children: "AI 团队工作实况" }), (0, import_jsx_runtime.jsx)("span", { children: "只读展示 · Agent 之间的任务协作" })] }), (0, import_jsx_runtime.jsx)("button", { type: "button", className: ActivityPanel_default.chatIconButton, "aria-label": "刷新群聊", title: "刷新群聊", onClick: () => {
    setRefreshToken((value) => value + 1);
  }, children: (0, import_jsx_runtime.jsx)(RefreshCw, { size: 13 }) })] }), (0, import_jsx_runtime.jsxs)("div", { className: ActivityPanel_default.chatNotice, children: [(0, import_jsx_runtime.jsx)(MessageCircle, { size: 13 }), " 用户指令仍在 DSH 主对话框中，群聊不接受输入"] }), loading && (0, import_jsx_runtime.jsx)("div", { className: ActivityPanel_default.chatLoading, children: "正在加载完整协作记录…" }), error && (0, import_jsx_runtime.jsx)("div", { className: ActivityPanel_default.chatError, role: "status", children: error }), uniqueMessages.length === 0 ? (0, import_jsx_runtime.jsx)("div", { className: ActivityPanel_default.chatEmpty, children: "等待 Agent 产生协作动态" }) : (0, import_jsx_runtime.jsx)("ol", { className: ActivityPanel_default.chatList, children: uniqueMessages.map((message) => (0, import_jsx_runtime.jsx)(ChatMessage, { team, message }, message.id)) })] });
}
function TeamArtifactsView({ team }) {
  const artifactsByUrl = /* @__PURE__ */ new Map();
  for (const artifact of team.artifacts ?? [])
    artifactsByUrl.set(artifact.url, { ...artifact, taskId: "", subject: "团队协作交付" });
  for (const task of team.tasks) {
    for (const artifact of task.artifacts)
      artifactsByUrl.set(artifact.url, { ...artifact, taskId: task.id, subject: task.subject });
  }
  const artifacts = [...artifactsByUrl.values()];
  if (artifacts.length === 0)
    return (0, import_jsx_runtime.jsx)("div", { className: ActivityPanel_default.artifactEmpty, children: "任务完成后，交付文件会出现在这里" });
  return (0, import_jsx_runtime.jsxs)("section", { className: ActivityPanel_default.artifactsSurface, "aria-label": "团队交付区", children: [(0, import_jsx_runtime.jsxs)("header", { className: ActivityPanel_default.artifactHead, children: [(0, import_jsx_runtime.jsx)("strong", { children: "任务交付" }), (0, import_jsx_runtime.jsxs)("span", { children: [artifacts.length, " 个文件"] })] }), (0, import_jsx_runtime.jsx)("ul", { className: ActivityPanel_default.artifactList, children: artifacts.map((artifact) => (0, import_jsx_runtime.jsxs)("li", { className: ActivityPanel_default.artifactCard, children: [(0, import_jsx_runtime.jsxs)("div", { children: [(0, import_jsx_runtime.jsx)("strong", { title: artifact.name, children: artifact.name }), (0, import_jsx_runtime.jsx)("span", { children: artifact.taskId === "" ? artifact.subject : `${artifact.taskId} · ${artifact.subject}` })] }), (0, import_jsx_runtime.jsx)("a", { href: artifact.url, download: artifact.name, className: ActivityPanel_default.artifactDownload, "aria-label": `下载 ${artifact.name}`, title: `下载 ${artifact.name}`, children: (0, import_jsx_runtime.jsx)(Download, { size: 14 }) })] }, `${artifact.taskId}:${artifact.url}`)) })] });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentTeamsCard.js
var import_jsx_runtime2 = require("react/jsx-runtime");
var import_react4 = require("react");

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentTeamsCard.module.css
var tagId2 = "@nanmicoder/dsh-agent-teams/AgentTeamsCard.module.css";
if (typeof document !== "undefined" && !document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId2) + "]")) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@nanmicoder/dsh-agent-teams";
  tag.dataset.pluginCss = tagId2;
  tag.textContent = "._2aD6G_root{box-sizing:border-box;border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module-platform);border-radius:10px;flex-direction:column;gap:8px;width:100%;min-width:0;padding:10px 12px;display:flex}._2aD6G_head{align-items:center;gap:8px;min-width:0;display:flex}._2aD6G_leadAvatar{border:1px solid var(--dsw-alias-line-strong);object-fit:cover;background:#0b1d33;border-radius:50%;flex:none;width:24px;height:24px}._2aD6G_teamName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;flex:0 auto;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}._2aD6G_memberCount{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;margin-left:auto;font-size:11px;line-height:16px}._2aD6G_panelButton{border:1px solid var(--dsw-alias-line-strong);background:var(--dsw-alias-bg-module);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:999px;flex:none;padding:2px 8px;font-size:10.5px;font-weight:600;line-height:16px;transition:border-color .12s,color .12s}._2aD6G_panelButton:hover{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}._2aD6G_panelButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}._2aD6G_members{flex-wrap:wrap;gap:6px;min-width:0;display:flex}._2aD6G_member{border:1px solid var(--dsw-alias-line-normal);background:var(--dsw-alias-bg-module);max-width:160px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:999px;align-items:center;gap:5px;padding:3px 8px 3px 3px;font-size:11px;font-weight:500;line-height:16px;transition:border-color .12s,background-color .12s;display:inline-flex}._2aD6G_member:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-fill-neutral)}._2aD6G_member:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}._2aD6G_memberArt{border:1px solid var(--dsw-alias-line-strong);object-fit:cover;background:#0b1d33;border-radius:50%;width:20px;height:20px}._2aD6G_memberInitial{background:var(--dsw-alias-bg-fill-business);width:20px;height:20px;color:var(--dsw-alias-label-on-fill);border-radius:50%;justify-content:center;align-items:center;font-size:10px;font-weight:600;line-height:20px;display:inline-flex}._2aD6G_memberName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}";
  document.head.appendChild(tag);
}
var AgentTeamsCard_default = { "head": "_2aD6G_head", "leadAvatar": "_2aD6G_leadAvatar", "member": "_2aD6G_member", "memberArt": "_2aD6G_memberArt", "memberCount": "_2aD6G_memberCount", "memberInitial": "_2aD6G_memberInitial", "memberName": "_2aD6G_memberName", "members": "_2aD6G_members", "panelButton": "_2aD6G_panelButton", "root": "_2aD6G_root", "teamName": "_2aD6G_teamName" };

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentTeamsCard.js
var OPEN_PANEL_EVENT = "agent-teams:open-panel";
function openActivityPanel(data) {
  window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, {
    detail: {
      teamId: data.teamId,
      captainSessionId: data.captainSessionId,
      teamName: data.teamName,
      members: data.members
    }
  }));
}
function AgentTeamsCard({ node, openMemberSession, sessionId }) {
  const data = node.data;
  const owner = data.captainSessionId || sessionId;
  const { teams, archivedTeams } = (0, import_react4.useSyncExternalStore)(subscribeActivitySnapshots, getActivitySnapshotsSnapshot);
  (0, import_react4.useEffect)(() => {
    return monitorAgentTeam(owner, data.teamId);
  }, [data.teamId, owner]);
  const snapshot = teams.find((team) => team.teamId === data.teamId && (owner === "" || team.captainSessionId === owner)) ?? archivedTeams.find((team) => team.teamId === data.teamId && (owner === "" || team.captainSessionId === owner));
  const resolved = (0, import_react4.useMemo)(() => ({
    ...data,
    captainSessionId: snapshot?.captainSessionId ?? owner,
    teamName: snapshot?.name ?? data.teamName,
    members: snapshot?.members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      ...member.agentId === void 0 ? {} : { agentId: member.agentId },
      ...member.agentVersion === void 0 ? {} : { agentVersion: member.agentVersion },
      ...member.soulId === void 0 ? {} : { soulId: member.soulId }
    })) ?? data.members
  }), [data, owner, snapshot]);
  return (0, import_jsx_runtime2.jsxs)("section", { className: AgentTeamsCard_default.root, "data-agent-teams-card": true, "data-team-id": resolved.teamId, children: [(0, import_jsx_runtime2.jsxs)("header", { className: AgentTeamsCard_default.head, children: [(0, import_jsx_runtime2.jsx)("img", { className: AgentTeamsCard_default.leadAvatar, src: LEAD_ART, alt: "", "aria-hidden": true }), (0, import_jsx_runtime2.jsx)("span", { className: AgentTeamsCard_default.teamName, title: resolved.teamName, children: resolved.teamName }), (0, import_jsx_runtime2.jsxs)("span", { className: AgentTeamsCard_default.memberCount, children: [resolved.members.length, " 名成员"] }), (0, import_jsx_runtime2.jsx)("button", { type: "button", className: AgentTeamsCard_default.panelButton, onClick: () => {
    openActivityPanel(resolved);
  }, "aria-label": "打开活动面板", title: "打开活动面板", children: "活动面板" })] }), resolved.members.length > 0 && (0, import_jsx_runtime2.jsx)("div", { className: AgentTeamsCard_default.members, children: resolved.members.map((member) => (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: AgentTeamsCard_default.member, onClick: () => {
    if (member.id !== "")
      void openMemberSession(resolved.captainSessionId, member.id);
  }, title: member.role === "" ? member.name : `${member.name} · ${member.role}`, children: [memberArtUrl(member.name, member.role) !== null ? (0, import_jsx_runtime2.jsx)("img", { className: AgentTeamsCard_default.memberArt, src: memberArtUrl(member.name, member.role) ?? "", alt: "", "aria-hidden": true }) : (0, import_jsx_runtime2.jsx)("span", { className: AgentTeamsCard_default.memberInitial, children: member.name.trim().slice(0, 1).toUpperCase() || "?" }), (0, import_jsx_runtime2.jsx)("span", { className: AgentTeamsCard_default.memberName, children: member.name })] }, member.id)) })] });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/tool-icons.js
var import_jsx_runtime3 = require("react/jsx-runtime");
var ICONS = {
  "douyin-publish": Send,
  "operations-inspiration": Lightbulb,
  video: Video,
  "design-image": Image,
  voice: AudioLines,
  "feishu-document": FileText,
  "compliance-review": FileCheck2,
  "asset-management": Archive,
  "material-matcher": Clapperboard,
  "mobile-control": Smartphone,
  "computer-control": MonitorCog,
  web: Earth,
  search: Search,
  "agent-team": Bot,
  tool: Wrench
};
var SUPPORTED = new Set(Object.keys(ICONS));
function toolIconKey(toolId, groupIconKey) {
  if (groupIconKey !== void 0 && SUPPORTED.has(groupIconKey))
    return groupIconKey;
  if (toolId.startsWith("douyin.") || toolId.startsWith("douyin_"))
    return "douyin-publish";
  if (toolId.startsWith("inspiration."))
    return "operations-inspiration";
  if (toolId.startsWith("seedance.") || toolId.startsWith("h3."))
    return "video";
  if (toolId.startsWith("design.") || toolId === "image_gen" || toolId === "generate_image")
    return "design-image";
  if (toolId.startsWith("voice-clone.") || toolId.startsWith("speech."))
    return "voice";
  if (toolId.startsWith("feishu."))
    return "feishu-document";
  if (toolId.startsWith("publish-precheck."))
    return "compliance-review";
  if (toolId.startsWith("assets.") || toolId.startsWith("assets_"))
    return "asset-management";
  if (toolId.startsWith("material."))
    return "material-matcher";
  if (toolId.startsWith("mobile.") || toolId.startsWith("mobile_") || toolId.startsWith("wechat_") || toolId.startsWith("wechat."))
    return "mobile-control";
  if (toolId.startsWith("computer_") || toolId.startsWith("computer."))
    return "computer-control";
  if (toolId === "web_search")
    return "web";
  if (toolId === "web_fetch")
    return "search";
  if (toolId.startsWith("agent_teams_"))
    return "agent-team";
  return "tool";
}
function groupToolIndicators(tools) {
  const groups = /* @__PURE__ */ new Map();
  for (const tool of tools) {
    const iconKey = toolIconKey(tool.id);
    const previous = groups.get(iconKey);
    if (previous === void 0) {
      groups.set(iconKey, {
        iconKey,
        representativeId: tool.id,
        labels: [tool.label],
        calls: tool.calls,
        failures: tool.failures,
        lastAt: tool.lastAt,
        ...tool.lastError === void 0 ? {} : { lastError: tool.lastError }
      });
      continue;
    }
    const newest = tool.lastAt >= previous.lastAt;
    groups.set(iconKey, {
      iconKey,
      representativeId: newest ? tool.id : previous.representativeId,
      labels: previous.labels.includes(tool.label) ? previous.labels : [...previous.labels, tool.label],
      calls: previous.calls + tool.calls,
      failures: previous.failures + tool.failures,
      lastAt: Math.max(previous.lastAt, tool.lastAt),
      ...newest && tool.lastError !== void 0 ? { lastError: tool.lastError } : previous.lastError === void 0 ? {} : { lastError: previous.lastError }
    });
  }
  return [...groups.values()];
}
function ToolIcon({ toolId, groupIconKey, size = 15 }) {
  const Icon2 = ICONS[toolIconKey(toolId, groupIconKey)];
  return (0, import_jsx_runtime3.jsx)(Icon2, { size, strokeWidth: 1.9, "aria-hidden": "true" });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/ToolLibraryView.js
var import_jsx_runtime4 = require("react/jsx-runtime");
var import_react5 = require("react");

// packages/opc-profile/agent-teams-desktop/source/lib/client/tool-library.js
var DEFAULT_GROUP_ACTIONS = {
  "seedance-video": "seedance.create",
  "minimax-h3-video": "h3.create",
  "ai-design-image": "design.create",
  "voice-clone": "voice-clone.create",
  "publish-precheck": "publish-precheck.scan",
  "mobile-control": "mobile_device_status"
};
function defaultToolForGroup(group) {
  const preferredId = DEFAULT_GROUP_ACTIONS[group.id];
  return group.tools.find((tool) => tool.id === preferredId) ?? group.tools.find((tool) => tool.effect === "paid" && tool.capabilityTags.includes("generation")) ?? group.tools[0];
}
function singletonGroup(tool) {
  return {
    id: `tool:${tool.id}:${tool.version}`,
    displayName: tool.displayName,
    tools: [tool]
  };
}
function sameGroupMetadata(left, right) {
  return left.displayName === right.displayName && left.description === right.description && left.order === right.order && left.iconKey === right.iconKey;
}
function groupTools(tools) {
  const groups = /* @__PURE__ */ new Map();
  for (const tool of tools) {
    if (tool.group === void 0) {
      const singleton = singletonGroup(tool);
      groups.set(singleton.id, singleton);
      continue;
    }
    const existing = groups.get(tool.group.id);
    if (existing !== void 0 && !sameGroupMetadata(existing, tool.group)) {
      throw new Error(`Invalid tool group metadata: ${tool.group.id}`);
    }
    groups.set(tool.group.id, existing === void 0 ? { ...tool.group, tools: [tool] } : { ...existing, tools: [...existing.tools, tool] });
  }
  return [...groups.values()].sort((left, right) => {
    if (left.order === void 0 && right.order === void 0)
      return 0;
    return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
  });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/tool-group-expansion.js
function selectedExpansion(groupIds, selectedGroupId) {
  return selectedGroupId !== void 0 && groupIds.includes(selectedGroupId) ? [selectedGroupId] : [];
}
function createToolGroupExpansionState(sessionId, groupIds, selectedGroupId) {
  return { sessionId, expandedGroupIds: selectedExpansion(groupIds, selectedGroupId) };
}
function reconcileToolGroupExpansionState(state, sessionId, groupIds, selectedGroupId) {
  if (state.sessionId !== sessionId)
    return createToolGroupExpansionState(sessionId, groupIds, selectedGroupId);
  const available = new Set(groupIds);
  const expandedGroupIds = state.expandedGroupIds.filter((groupId) => available.has(groupId));
  if (expandedGroupIds.length === state.expandedGroupIds.length)
    return state;
  return { ...state, expandedGroupIds };
}
function toggleToolGroupExpansion(state, groupId) {
  const isExpanded = state.expandedGroupIds.includes(groupId);
  return {
    ...state,
    expandedGroupIds: isExpanded ? state.expandedGroupIds.filter((current) => current !== groupId) : [...state.expandedGroupIds, groupId]
  };
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/ToolLibraryView.module.css
var tagId3 = "@nanmicoder/dsh-agent-teams/ToolLibraryView.module.css";
if (typeof document !== "undefined" && !document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId3) + "]")) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@nanmicoder/dsh-agent-teams";
  tag.dataset.pluginCss = tagId3;
  tag.textContent = ".-\\31 TeEG_root{min-width:0;color:var(--dsw-alias-label-primary);flex-direction:column;display:flex}.-\\31 TeEG_libraryIntro{border-bottom:1px solid var(--dsw-alias-border-l2);gap:3px;padding:10px 2px 12px;display:grid}.-\\31 TeEG_libraryIntro strong{font-size:12px;line-height:18px}.-\\31 TeEG_libraryIntro span{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px}.-\\31 TeEG_loadState,.-\\31 TeEG_empty{min-height:112px;color:var(--dsw-alias-label-tertiary);text-align:center;place-items:center;gap:6px;padding:18px;font-size:11px;display:grid}.-\\31 TeEG_loadState strong{color:var(--dsw-alias-label-primary);font-size:13px}.-\\31 TeEG_header{margin-bottom:12px}.-\\31 TeEG_header>div{align-items:center;gap:8px;display:flex}.-\\31 TeEG_header h2{letter-spacing:0;margin:0;font-size:14px;line-height:20px}.-\\31 TeEG_header span{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;display:block}.-\\31 TeEG_filters{gap:7px;margin-bottom:10px;display:grid}.-\\31 TeEG_search{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:32px;color:var(--dsw-alias-label-tertiary);border-radius:6px;align-items:center;gap:7px;padding:0 9px;display:flex}.-\\31 TeEG_search input{min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:0;outline:0;flex:1;font-size:11px}.-\\31 TeEG_filterRow{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;display:grid}.-\\31 TeEG_filterRow select,.-\\31 TeEG_field input,.-\\31 TeEG_field select,.-\\31 TeEG_field textarea,.-\\31 TeEG_experienceItem textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:5px}.-\\31 TeEG_filterRow select{min-width:0;height:29px;padding:0 7px;font-size:10px}.-\\31 TeEG_toolList{border-top:1px solid var(--dsw-alias-border-l2);display:grid}.-\\31 TeEG_toolGroup{border-bottom:1px solid var(--dsw-alias-border-l2);min-width:0}.-\\31 TeEG_toolGroup[data-selected=true]{background:var(--dsw-alias-bg-layer-2)}.-\\31 TeEG_groupHeader{grid-template-columns:minmax(0,1fr) 29px;align-items:center;gap:3px;min-height:54px;padding:0 4px 0 0;display:grid}.-\\31 TeEG_groupToggle{width:100%;min-width:0;min-height:54px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;grid-template-columns:29px minmax(0,1fr) 16px;align-items:center;gap:8px;padding:7px 5px;display:grid}.-\\31 TeEG_groupToggle:hover{background:var(--dsw-alias-interactive-bg-hover)}.-\\31 TeEG_groupIcon{background:var(--dsw-alias-bg-layer-3);width:29px;height:29px;color:var(--dsw-alias-label-primary);border-radius:5px;place-items:center;display:grid}.-\\31 TeEG_groupIdentity{min-width:0}.-\\31 TeEG_groupIdentity strong,.-\\31 TeEG_groupIdentity span{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.-\\31 TeEG_groupIdentity strong{font-size:11px;line-height:17px}.-\\31 TeEG_groupIdentity span{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.-\\31 TeEG_groupChevron{transition:transform .12s}.-\\31 TeEG_groupChevron[data-expanded=true]{transform:rotate(90deg)}.-\\31 TeEG_groupChildren{border-left:1px solid var(--dsw-alias-border-l2);gap:2px;margin:0 0 7px 19px;padding-left:12px;display:grid}.-\\31 TeEG_accountButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);min-height:27px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:4px;justify-self:start;padding:4px 8px;font-size:10px}.-\\31 TeEG_accountButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.-\\31 TeEG_modalBackdrop{z-index:20;background:#00000073;place-items:center;padding:18px;display:grid;position:fixed;inset:0}.-\\31 TeEG_accountModal,.-\\31 TeEG_toolModal,.-\\31 TeEG_providerModal{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:8px;width:min(360px,100%);max-height:min(640px,100vh - 36px);padding:14px;overflow:auto;box-shadow:0 12px 36px #00000040}.-\\31 TeEG_providerStatus{border-left:3px solid var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2);gap:2px;margin:12px 0;padding:9px;display:grid}.-\\31 TeEG_providerStatus[data-status=connected]{border-left-color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_providerStatus[data-status=invalid],.-\\31 TeEG_providerStatus[data-status=unavailable]{border-left-color:var(--dsw-alias-state-error-primary)}.-\\31 TeEG_providerStatus strong{font-size:11px}.-\\31 TeEG_providerStatusLabel{align-items:center;gap:5px;display:inline-flex}.-\\31 TeEG_providerStatusDot{background:var(--dsw-alias-state-error-primary);border-radius:50%;width:6px;height:6px}.-\\31 TeEG_providerStatus[data-status=connected] .-\\31 TeEG_providerStatusDot{background:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_providerStatus span{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.-\\31 TeEG_secretField{gap:4px;display:flex}.-\\31 TeEG_secretField input{flex:1;min-width:0}.-\\31 TeEG_providerActions{flex-wrap:wrap;align-items:center;gap:5px;margin-top:10px;display:flex}.-\\31 TeEG_providerActions .-\\31 TeEG_primaryButton,.-\\31 TeEG_providerActions .-\\31 TeEG_textButton{margin-top:0}.-\\31 TeEG_providerDestination{gap:5px;margin-top:10px;display:flex}.-\\31 TeEG_providerDestination input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);min-width:0;height:29px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:5px;flex:1;padding:0 7px;font-size:10px}.-\\31 TeEG_providerDestination .-\\31 TeEG_textButton{flex:none;margin-top:0}.-\\31 TeEG_dangerButton{background:var(--dsw-alias-bg-layer-3);min-height:27px;color:var(--dsw-alias-state-error-primary);cursor:pointer;border:0;border-radius:4px;padding:4px 8px;font-size:10px}.-\\31 TeEG_docsLink{color:var(--dsw-alias-brand-primary);align-items:center;gap:4px;margin-top:10px;font-size:10px;text-decoration:none;display:inline-flex}.-\\31 TeEG_modalHeader{justify-content:space-between;align-items:center;gap:8px;font-size:13px;display:flex}.-\\31 TeEG_modalTitle{align-items:center;gap:7px;min-width:0;display:inline-flex}.-\\31 TeEG_modalTitle strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.-\\31 TeEG_accountState{color:var(--dsw-alias-state-error-primary);margin-top:12px;font-size:11px;font-weight:600}.-\\31 TeEG_accountState[data-health=healthy]{color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_accountFacts{gap:7px;margin:12px 0 0;display:grid}.-\\31 TeEG_accountFacts>div{background:var(--dsw-alias-bg-layer-2);border-radius:5px;padding:8px}.-\\31 TeEG_accountFacts dt{color:var(--dsw-alias-label-tertiary);font-size:9px}.-\\31 TeEG_accountFacts dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin:3px 0 0;font-size:11px}.-\\31 TeEG_modalHint{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:9px;line-height:14px}.-\\31 TeEG_toolItem{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;min-width:0;color:inherit;text-align:left;cursor:pointer;border-radius:6px;grid-template-columns:minmax(0,1fr) 8px;align-items:center;gap:7px;padding:8px;display:grid}.-\\31 TeEG_toolItem[data-nested=true]{background:0 0;border-color:#0000;border-radius:4px;padding:6px 7px}.-\\31 TeEG_toolItem[data-selected=true]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, var(--dsw-alias-bg-layer-1))}.-\\31 TeEG_toolIcon{background:var(--dsw-alias-bg-layer-3);width:27px;height:27px;color:var(--dsw-alias-label-secondary);border-radius:5px;place-items:center;display:grid}.-\\31 TeEG_toolIdentity{min-width:0}.-\\31 TeEG_toolIdentity strong,.-\\31 TeEG_toolIdentity span{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.-\\31 TeEG_toolIdentity strong{font-size:11px;line-height:16px}.-\\31 TeEG_toolIdentity span{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.-\\31 TeEG_healthDot{background:var(--dsw-alias-label-tertiary);border-radius:50%;width:6px;height:6px}[data-health=healthy].-\\31 TeEG_healthDot{background:var(--dsw-alias-state-success-primary)}[data-health=degraded].-\\31 TeEG_healthDot{background:var(--dsw-alias-state-warn-primary)}[data-health=unavailable].-\\31 TeEG_healthDot{background:var(--dsw-alias-state-error-primary)}.-\\31 TeEG_detail{border-top:2px solid var(--dsw-alias-label-primary);margin-top:0}.-\\31 TeEG_detailHeader{justify-content:space-between;align-items:flex-start;gap:8px;padding:12px 0 9px;display:flex}.-\\31 TeEG_detailHeader strong,.-\\31 TeEG_detailHeader code{display:block}.-\\31 TeEG_detailHeader strong{font-size:12px;line-height:18px}.-\\31 TeEG_detailHeader code{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin-top:2px;font-size:9px}.-\\31 TeEG_detailHeader>span{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 5px;font-size:9px;line-height:15px}.-\\31 TeEG_detailHeader>span[data-health=healthy]{color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_detailHeader>span[data-health=degraded]{color:var(--dsw-alias-state-warn-primary)}.-\\31 TeEG_detailHeader>span[data-health=unavailable]{color:var(--dsw-alias-state-error-primary)}.-\\31 TeEG_tabs{background:var(--dsw-alias-bg-layer-2);border-radius:6px;grid-template-columns:repeat(3,1fr);padding:3px;display:grid}.-\\31 TeEG_tabs button{height:27px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:4px;font-size:10px}.-\\31 TeEG_tabs button[aria-selected=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l2);font-weight:600}.-\\31 TeEG_tabBody{padding-top:11px}.-\\31 TeEG_description{color:var(--dsw-alias-label-secondary);margin:0 0 10px;font-size:11px;line-height:17px}.-\\31 TeEG_factGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0;display:grid}.-\\31 TeEG_factGrid>div{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:5px;min-width:0;padding:8px}.-\\31 TeEG_factGrid dt{color:var(--dsw-alias-label-tertiary);font-size:9px}.-\\31 TeEG_factGrid dd{overflow-wrap:anywhere;align-items:center;gap:4px;min-width:0;margin:3px 0 0;font-size:10px;display:flex}.-\\31 TeEG_factGrid dd[data-health=healthy]{color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_factGrid dd[data-health=degraded]{color:var(--dsw-alias-state-warn-primary)}.-\\31 TeEG_factGrid dd[data-health=unavailable]{color:var(--dsw-alias-state-error-primary)}.-\\31 TeEG_detailSection{border-bottom:1px solid var(--dsw-alias-border-l2);padding:11px 0}.-\\31 TeEG_detailSection h4{letter-spacing:0;margin:0 0 7px;font-size:10px;line-height:16px}.-\\31 TeEG_detailSection p{color:var(--dsw-alias-label-secondary);margin:0;font-size:10px;line-height:16px}.-\\31 TeEG_detailSection pre{background:var(--dsw-alias-bg-layer-2);max-height:180px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;border-radius:5px;margin:0;padding:8px;font-size:9px;line-height:15px;overflow:auto}.-\\31 TeEG_sectionTitle{justify-content:space-between;align-items:center;display:flex}.-\\31 TeEG_tags{flex-wrap:wrap;gap:4px;display:flex}.-\\31 TeEG_tags span,.-\\31 TeEG_experienceMeta span{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 5px;font-size:9px;line-height:15px}.-\\31 TeEG_formGrid{gap:9px;display:grid}.-\\31 TeEG_field{color:var(--dsw-alias-label-secondary);gap:4px;font-size:10px;display:grid}.-\\31 TeEG_field input,.-\\31 TeEG_field select{height:31px;padding:0 8px}.-\\31 TeEG_field textarea,.-\\31 TeEG_experienceItem textarea{resize:vertical;min-height:70px;padding:7px 8px}.-\\31 TeEG_field small{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.-\\31 TeEG_checkboxField{justify-content:space-between;align-items:center;gap:8px;font-size:10px;display:flex}.-\\31 TeEG_primaryButton,.-\\31 TeEG_textButton,.-\\31 TeEG_iconButton{cursor:pointer;border:0;justify-content:center;align-items:center;display:inline-flex}.-\\31 TeEG_primaryButton{background:var(--dsw-alias-state-business-primary);min-height:30px;color:var(--dsw-alias-label-primary-inverted,#fff);border-radius:5px;gap:5px;margin-top:10px;padding:5px 10px;font-size:10px;font-weight:600}.-\\31 TeEG_primaryButton:disabled,.-\\31 TeEG_iconButton:disabled{cursor:not-allowed;opacity:.5}.-\\31 TeEG_approvalCard{border:1px solid var(--dsw-alias-border-l2);border-left:3px solid var(--dsw-alias-state-success-primary);background:var(--dsw-alias-bg-layer-1);border-radius:6px;margin-top:10px;padding:10px}.-\\31 TeEG_approvalCard[data-protected=true]{border-left-color:var(--dsw-alias-state-warn-primary)}.-\\31 TeEG_approvalCard strong,.-\\31 TeEG_approvalCard span{display:block}.-\\31 TeEG_approvalCard strong{font-size:11px}.-\\31 TeEG_approvalCard span,.-\\31 TeEG_approvalCard p{color:var(--dsw-alias-label-secondary);font-size:9px;line-height:15px}.-\\31 TeEG_approvalCard p{margin:6px 0 0}.-\\31 TeEG_callState{border-left:3px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);align-items:flex-start;gap:7px;margin-top:9px;padding:9px;display:flex}.-\\31 TeEG_callState strong,.-\\31 TeEG_callState span{font-size:10px;line-height:15px;display:block}.-\\31 TeEG_callState span{color:var(--dsw-alias-label-tertiary)}.-\\31 TeEG_inlineError{color:var(--dsw-alias-state-error-primary);margin-top:8px;font-size:10px;line-height:16px}.-\\31 TeEG_inlineStatus{color:var(--dsw-alias-label-secondary);margin-top:8px;font-size:10px;line-height:16px}.-\\31 TeEG_inlineStatus[data-state=success]{color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_inlineStatus[data-state=error]{color:var(--dsw-alias-state-error-primary)}.-\\31 TeEG_experienceList{gap:7px;display:grid}.-\\31 TeEG_experienceItem{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:9px;position:relative}.-\\31 TeEG_experienceMeta{flex-wrap:wrap;gap:4px;padding-right:82px;display:flex}.-\\31 TeEG_experienceItem p{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:7px 0 0;font-size:10px;line-height:16px}.-\\31 TeEG_experienceActions{gap:2px;display:flex;position:absolute;top:7px;right:7px}.-\\31 TeEG_resourceList{gap:7px;padding-top:11px;display:grid}.-\\31 TeEG_resourceItem{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:5px;justify-content:space-between;align-items:center;gap:9px;min-width:0;padding:9px;display:flex}.-\\31 TeEG_resourceText{gap:2px;min-width:0;display:grid}.-\\31 TeEG_resourceText strong,.-\\31 TeEG_resourceText span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.-\\31 TeEG_resourceText strong{font-size:10px;line-height:15px}.-\\31 TeEG_resourceText span{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px}.-\\31 TeEG_resourceDownload{width:27px;height:27px;color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;place-items:center;display:grid}.-\\31 TeEG_resourceDownload:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.-\\31 TeEG_resourceBadge{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);border-radius:4px;flex:none;padding:2px 5px;font-size:9px}.-\\31 TeEG_resourceBadge[data-active=true]{color:var(--dsw-alias-state-success-primary)}.-\\31 TeEG_iconButton{width:25px;height:25px;color:var(--dsw-alias-label-secondary);background:0 0;border-radius:4px}.-\\31 TeEG_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.-\\31 TeEG_textButton{background:var(--dsw-alias-bg-layer-3);min-height:27px;color:var(--dsw-alias-label-primary);border-radius:4px;margin-top:5px;padding:4px 8px;font-size:10px}.-\\31 TeEG_search:focus-within,.-\\31 TeEG_filterRow select:focus-visible,.-\\31 TeEG_groupToggle:focus-visible,.-\\31 TeEG_toolItem:focus-visible,.-\\31 TeEG_tabs button:focus-visible,.-\\31 TeEG_field input:focus-visible,.-\\31 TeEG_field select:focus-visible,.-\\31 TeEG_field textarea:focus-visible,.-\\31 TeEG_primaryButton:focus-visible,.-\\31 TeEG_iconButton:focus-visible,.-\\31 TeEG_textButton:focus-visible,.-\\31 TeEG_dangerButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}@media (width<=480px){.-\\31 TeEG_factGrid,.-\\31 TeEG_filterRow{grid-template-columns:1fr}}@media (prefers-reduced-motion:reduce){.-\\31 TeEG_groupChevron,.-\\31 TeEG_toolItem,.-\\31 TeEG_primaryButton{transition:none}}";
  document.head.appendChild(tag);
}
var ToolLibraryView_default = { "accountButton": "-1TeEG_accountButton", "accountFacts": "-1TeEG_accountFacts", "accountModal": "-1TeEG_accountModal", "accountState": "-1TeEG_accountState", "approvalCard": "-1TeEG_approvalCard", "callState": "-1TeEG_callState", "checkboxField": "-1TeEG_checkboxField", "dangerButton": "-1TeEG_dangerButton", "description": "-1TeEG_description", "detail": "-1TeEG_detail", "detailHeader": "-1TeEG_detailHeader", "detailSection": "-1TeEG_detailSection", "docsLink": "-1TeEG_docsLink", "empty": "-1TeEG_empty", "experienceActions": "-1TeEG_experienceActions", "experienceItem": "-1TeEG_experienceItem", "experienceList": "-1TeEG_experienceList", "experienceMeta": "-1TeEG_experienceMeta", "factGrid": "-1TeEG_factGrid", "field": "-1TeEG_field", "filterRow": "-1TeEG_filterRow", "filters": "-1TeEG_filters", "formGrid": "-1TeEG_formGrid", "groupChevron": "-1TeEG_groupChevron", "groupChildren": "-1TeEG_groupChildren", "groupHeader": "-1TeEG_groupHeader", "groupIcon": "-1TeEG_groupIcon", "groupIdentity": "-1TeEG_groupIdentity", "groupToggle": "-1TeEG_groupToggle", "header": "-1TeEG_header", "healthDot": "-1TeEG_healthDot", "iconButton": "-1TeEG_iconButton", "inlineError": "-1TeEG_inlineError", "inlineStatus": "-1TeEG_inlineStatus", "libraryIntro": "-1TeEG_libraryIntro", "loadState": "-1TeEG_loadState", "modalBackdrop": "-1TeEG_modalBackdrop", "modalHeader": "-1TeEG_modalHeader", "modalHint": "-1TeEG_modalHint", "modalTitle": "-1TeEG_modalTitle", "primaryButton": "-1TeEG_primaryButton", "providerActions": "-1TeEG_providerActions", "providerDestination": "-1TeEG_providerDestination", "providerModal": "-1TeEG_providerModal", "providerStatus": "-1TeEG_providerStatus", "providerStatusDot": "-1TeEG_providerStatusDot", "providerStatusLabel": "-1TeEG_providerStatusLabel", "resourceBadge": "-1TeEG_resourceBadge", "resourceDownload": "-1TeEG_resourceDownload", "resourceItem": "-1TeEG_resourceItem", "resourceList": "-1TeEG_resourceList", "resourceText": "-1TeEG_resourceText", "root": "-1TeEG_root", "search": "-1TeEG_search", "secretField": "-1TeEG_secretField", "sectionTitle": "-1TeEG_sectionTitle", "tabBody": "-1TeEG_tabBody", "tabs": "-1TeEG_tabs", "tags": "-1TeEG_tags", "textButton": "-1TeEG_textButton", "toolGroup": "-1TeEG_toolGroup", "toolIcon": "-1TeEG_toolIcon", "toolIdentity": "-1TeEG_toolIdentity", "toolItem": "-1TeEG_toolItem", "toolList": "-1TeEG_toolList", "toolModal": "-1TeEG_toolModal" };

// packages/opc-profile/agent-teams-desktop/source/lib/client/ToolLibraryView.js
var HEALTH_LABEL = { healthy: "健康", degraded: "降级", unavailable: "不可用", unknown: "未知" };
var EFFECT_LABEL = { read: "免费读取", write: "写入", paid: "付费", destructive: "破坏性" };
var PROVIDER_STATUS_LABEL = {
  not_configured: "未配置",
  configured: "待连接",
  connection_required: "待连接",
  connected: "已连接",
  invalid: "配置失效",
  unavailable: "暂不可用"
};
function configurationErrorMessage(cause, fallback) {
  return cause instanceof Error && cause.message.length > 0 && cause.message.length <= 160 ? cause.message : fallback;
}
function ProviderConfigurationModal({ metadata, client, onClose }) {
  const [configuration, setConfiguration] = (0, import_react5.useState)(null);
  const [feishuConnection, setFeishuConnection] = (0, import_react5.useState)(null);
  const [values, setValues] = (0, import_react5.useState)({});
  const [visibleSecrets, setVisibleSecrets] = (0, import_react5.useState)({});
  const [folderUrl, setFolderUrl] = (0, import_react5.useState)("");
  const [message, setMessage] = (0, import_react5.useState)(null);
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const load = () => {
    setMessage(null);
    void client.getProviderConfiguration(metadata.providerId).then(setConfiguration).catch(() => setMessage("配置状态暂时无法读取，请稍后重试。"));
    if (metadata.providerId === "feishu" && client.getFeishuConnection) {
      void client.getFeishuConnection().then(setFeishuConnection).catch(() => setMessage("飞书授权状态暂时无法读取，请稍后重试。"));
    } else
      setFeishuConnection(null);
  };
  (0, import_react5.useEffect)(load, [client, metadata.providerId]);
  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const pending = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim().length > 0));
      const missing = metadata.fields.find((field) => field.required && !configuration?.fields[field.key]?.configured && pending[field.key] === void 0);
      if (missing !== void 0)
        throw new Error(`请填写${missing.label}`);
      const saved = await client.saveProviderConfiguration(metadata.providerId, pending);
      setConfiguration(saved);
      setValues({});
      setVisibleSecrets({});
      const tested = await client.testProviderConfiguration(metadata.providerId);
      setConfiguration(tested);
      if (metadata.providerId === "feishu" && client.getFeishuConnection)
        setFeishuConnection(await client.getFeishuConnection());
      setMessage(tested.status === "invalid" ? "配置已保存，但连接测试未通过，请检查凭证。" : tested.status === "unavailable" ? "配置已保存，但连接测试暂不可用，请稍后重试。" : "配置已保存并完成连接测试。");
    } catch (cause) {
      setMessage(configurationErrorMessage(cause, "配置保存失败，请检查填写内容。"));
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setConfiguration(await client.testProviderConfiguration(metadata.providerId));
      setMessage("连接测试已完成。");
    } catch {
      setMessage("连接测试未通过，请检查配置。");
    } finally {
      setBusy(false);
    }
  };
  const connect = async () => {
    const opened = window.open("about:blank", "opc-provider-oauth", "popup,width=560,height=720");
    if (opened === null) {
      setMessage("浏览器阻止了授权窗口，请允许弹窗后重试。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { authorizationUrl } = await client.startProviderOAuth(metadata.providerId);
      opened.location.replace(authorizationUrl);
      setMessage("请在新窗口完成授权，然后刷新配置状态。");
    } catch (cause) {
      opened.close();
      setMessage(configurationErrorMessage(cause, "无法发起授权，请先保存并测试配置。"));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm("删除后该工具将无法使用当前商户配置。是否继续？"))
      return;
    setBusy(true);
    setMessage(null);
    try {
      await client.deleteProviderConfiguration(metadata.providerId);
      setConfiguration(null);
      setValues({});
      setVisibleSecrets({});
      setMessage("配置已删除。");
    } catch {
      setMessage("删除配置失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  };
  const saveFolder = async () => {
    if (!client.setFeishuDestination || !folderUrl.trim())
      return;
    setBusy(true);
    setMessage(null);
    try {
      await client.setFeishuDestination(folderUrl.trim());
      setFolderUrl("");
      setMessage("默认飞书文件夹已设置。");
    } catch {
      setMessage("默认飞书文件夹链接无效或暂不可访问。");
    } finally {
      setBusy(false);
    }
  };
  const configuredStatus = configuration?.status ?? metadata.status ?? "not_configured";
  const status = metadata.providerId === "feishu" && configuredStatus === "connected" && feishuConnection?.status === "reauthorization_required" ? "connection_required" : configuredStatus;
  const needsOAuth = metadata.authType === "oauth_app" || metadata.authType === "account_connection" || metadata.authType === "composite";
  return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.modalBackdrop, role: "presentation", onClick: onClose, children: (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.providerModal, role: "dialog", "aria-modal": "true", "aria-label": `配置 ${metadata.providerId}`, onClick: (event) => event.stopPropagation(), children: [(0, import_jsx_runtime4.jsxs)("header", { className: ToolLibraryView_default.modalHeader, children: [(0, import_jsx_runtime4.jsx)("strong", { children: "配置工具" }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": "关闭工具配置", onClick: onClose, children: (0, import_jsx_runtime4.jsx)(X, { size: 15 }) })] }), (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.providerStatus, "data-status": status, children: [(0, import_jsx_runtime4.jsxs)("strong", { className: ToolLibraryView_default.providerStatusLabel, children: [(0, import_jsx_runtime4.jsx)("span", { className: ToolLibraryView_default.providerStatusDot, "aria-hidden": "true" }), PROVIDER_STATUS_LABEL[status]] }), (0, import_jsx_runtime4.jsx)("span", { children: metadata.providerId === "feishu" && feishuConnection?.status === "reauthorization_required" ? "当前授权缺少飞书文档权限，请在飞书开放平台添加文档权限后重新授权。" : configuration?.accountName ?? "配置只归当前商户所有，密钥不会展示给 AI 或浏览器历史。" })] }), (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.formGrid, children: metadata.fields.map((field) => {
    const fieldState = configuration?.fields[field.key];
    const visible = visibleSecrets[field.key] === true;
    return (0, import_jsx_runtime4.jsxs)("label", { className: ToolLibraryView_default.field, children: [(0, import_jsx_runtime4.jsxs)("span", { children: [field.label, field.required ? " *" : ""] }), (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.secretField, children: [(0, import_jsx_runtime4.jsx)("input", { "aria-label": field.label, type: field.type === "secret" ? visible ? "text" : "password" : "text", value: values[field.key] ?? "", placeholder: fieldState?.configured ? `${fieldState.mask ?? "已配置"}（留空则不变）` : field.placeholder, onChange: (event) => setValues({ ...values, [field.key]: event.target.value }), autoComplete: "off" }), field.type === "secret" && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": visible ? `隐藏${field.label}` : `显示${field.label}`, onClick: () => setVisibleSecrets({ ...visibleSecrets, [field.key]: !visible }), children: visible ? (0, import_jsx_runtime4.jsx)(EyeOff, { size: 14 }) : (0, import_jsx_runtime4.jsx)(Eye, { size: 14 }) })] }), field.description && (0, import_jsx_runtime4.jsx)("small", { children: field.description })] }, field.key);
  }) }), metadata.providerId === "feishu" && status === "connected" && (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.providerDestination, children: [(0, import_jsx_runtime4.jsx)("input", { "aria-label": "默认飞书文件夹链接", value: folderUrl, placeholder: "粘贴飞书文件夹链接", onChange: (event) => setFolderUrl(event.target.value) }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.textButton, onClick: () => {
    void saveFolder();
  }, disabled: busy || !folderUrl.trim(), children: "设为默认" })] }), feishuConnection?.scopes && (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.tags, children: feishuConnection.scopes.map((scope) => (0, import_jsx_runtime4.jsx)("span", { children: scope }, scope)) }), (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.providerActions, children: [(0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.primaryButton, onClick: () => {
    void save();
  }, disabled: busy, children: "保存配置" }), metadata.canTest && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.textButton, onClick: () => {
    void test();
  }, disabled: busy, children: "测试连接" }), needsOAuth && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.textButton, onClick: () => {
    void connect();
  }, disabled: busy || status === "not_configured" || status === "invalid", children: status === "connected" ? "重新授权" : "连接账号" }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.textButton, onClick: load, disabled: busy, children: "刷新状态" }), configuration !== null && status !== "not_configured" && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.dangerButton, onClick: () => {
    void remove();
  }, disabled: busy, children: "删除配置" })] }), metadata.docsUrl && (0, import_jsx_runtime4.jsxs)("a", { className: ToolLibraryView_default.docsLink, href: metadata.docsUrl, target: "_blank", rel: "noreferrer", children: ["查看供应商配置文档 ", (0, import_jsx_runtime4.jsx)(ExternalLink, { size: 12 })] }), message && (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.inlineStatus, role: "status", children: message })] }) });
}
function DouyinAccountButton({ client }) {
  const [account, setAccount] = (0, import_react5.useState)(null);
  const [open, setOpen] = (0, import_react5.useState)(false);
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [message, setMessage] = (0, import_react5.useState)(null);
  const show = async () => {
    if (!client.getDouyinAccount)
      return;
    setBusy(true);
    setMessage(null);
    try {
      try {
        setAccount(await client.getDouyinAccount());
      } catch {
        if (!client.openEgoLite)
          throw new Error("open_ego_lite_unavailable");
        await client.openEgoLite();
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        setAccount(await client.getDouyinAccount());
      }
      setOpen(true);
    } catch {
      setMessage("已尝试打开 Ego Lite，但当前账号仍无法读取。请在 Ego Lite 中完成登录后重试。");
    } finally {
      setBusy(false);
    }
  };
  return (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [(0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.accountButton, onClick: () => {
    void show();
  }, disabled: busy, children: "查看当前账号" }), message && (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.inlineError, role: "status", children: message }), open && account && (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.modalBackdrop, role: "presentation", onClick: () => setOpen(false), children: (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.accountModal, role: "dialog", "aria-modal": "true", "aria-label": "当前抖音账号", onClick: (event) => event.stopPropagation(), children: [(0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.modalHeader, children: [(0, import_jsx_runtime4.jsx)("strong", { children: "当前抖音账号" }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": "关闭账号信息", onClick: () => setOpen(false), children: "×" })] }), (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.accountState, "data-health": account.loggedIn ? "healthy" : "unavailable", children: account.loggedIn ? "已登录" : "未登录" }), (0, import_jsx_runtime4.jsxs)("dl", { className: ToolLibraryView_default.accountFacts, children: [(0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "账号名称" }), (0, import_jsx_runtime4.jsx)("dd", { children: account.displayName ?? "未识别" })] }), (0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "账号标识" }), (0, import_jsx_runtime4.jsx)("dd", { children: account.accountId ?? "未识别" })] }), (0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "浏览器页面" }), (0, import_jsx_runtime4.jsx)("dd", { children: account.profileUrl ?? "当前任务空间" })] })] }), (0, import_jsx_runtime4.jsx)("p", { className: ToolLibraryView_default.modalHint, children: "信息来自当前 Ego Lite 浏览器登录态，不保存或展示 Cookie、密码和验证码。" })] }) })] });
}
function ToolResources({ tool, client }) {
  const [items, setItems] = (0, import_react5.useState)([]);
  const [state, setState] = (0, import_react5.useState)("loading");
  const [account, setAccount] = (0, import_react5.useState)(null);
  const isDouyin = tool.id.startsWith("douyin.");
  (0, import_react5.useEffect)(() => {
    let active = true;
    setState("loading");
    setItems([]);
    setAccount(null);
    const request2 = isDouyin && client.getDouyinAccount !== void 0 ? client.getDouyinAccount().then((value) => {
      if (active)
        setAccount(value);
    }) : client.listResources(tool.id).then((value) => {
      if (active)
        setItems(value);
    });
    void request2.then(() => {
      if (active)
        setState("ready");
    }).catch(() => {
      if (active)
        setState("error");
    });
    return () => {
      active = false;
    };
  }, [client, isDouyin, tool.id]);
  if (state === "loading")
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.empty, children: "正在读取可用资源..." });
  if (state === "error")
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.empty, children: "该工具暂时没有可查看的资源" });
  if (account !== null)
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.resourceList, children: (0, import_jsx_runtime4.jsxs)("article", { className: ToolLibraryView_default.resourceItem, children: [(0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.resourceText, children: [(0, import_jsx_runtime4.jsx)("strong", { children: account.loggedIn ? account.displayName ?? "已绑定抖音账号" : "当前未登录抖音账号" }), (0, import_jsx_runtime4.jsx)("span", { children: account.loggedIn ? `账号标识：${account.accountId ?? "未识别"}` : "请先在 Ego Lite 中完成登录" })] }), (0, import_jsx_runtime4.jsx)("span", { className: ToolLibraryView_default.resourceBadge, "data-active": account.loggedIn ? "true" : "false", children: account.loggedIn ? "已绑定" : "未登录" })] }) });
  if (items.length === 0)
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.empty, children: "该工具当前没有可下载的文件或可查看的账号" });
  return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.resourceList, children: items.map((item) => (0, import_jsx_runtime4.jsxs)("article", { className: ToolLibraryView_default.resourceItem, children: [(0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.resourceText, children: [(0, import_jsx_runtime4.jsx)("strong", { children: item.title }), (0, import_jsx_runtime4.jsxs)("span", { children: [item.description ?? item.mimeType ?? "受控资源", item.sourceDurationSeconds === void 0 ? "" : ` · 原始样音 ${item.sourceDurationSeconds} 秒`] })] }), item.downloadable && (0, import_jsx_runtime4.jsx)("a", { className: ToolLibraryView_default.resourceDownload, href: client.resourceDownloadUrl(tool.id, item.id), download: true, "aria-label": `下载 ${item.title}`, title: `下载 ${item.title}`, children: (0, import_jsx_runtime4.jsx)(Download, { size: 14 }) })] }, item.id)) });
}
function ToolDetailModal({ tool, client, onClose }) {
  const [tab, setTab] = (0, import_react5.useState)("overview");
  const [current, setCurrent] = (0, import_react5.useState)(tool);
  const [refreshing, setRefreshing] = (0, import_react5.useState)(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      const health = await client.getHealth(tool.id, tool.version);
      setCurrent({ ...tool, health });
    } finally {
      setRefreshing(false);
    }
  };
  return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.modalBackdrop, role: "presentation", onClick: onClose, children: (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.toolModal, role: "dialog", "aria-modal": "true", "aria-label": `${tool.displayName}详情`, onClick: (event) => event.stopPropagation(), children: [(0, import_jsx_runtime4.jsxs)("header", { className: ToolLibraryView_default.modalHeader, children: [(0, import_jsx_runtime4.jsxs)("span", { className: ToolLibraryView_default.modalTitle, children: [(0, import_jsx_runtime4.jsx)(ToolIcon, { toolId: tool.id, groupIconKey: tool.group?.iconKey, size: 16 }), (0, import_jsx_runtime4.jsx)("strong", { children: tool.displayName })] }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": "关闭工具详情", onClick: onClose, children: (0, import_jsx_runtime4.jsx)(X, { size: 15 }) })] }), (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.tabs, role: "tablist", "aria-label": "工具详情页签", children: [(0, import_jsx_runtime4.jsx)("button", { type: "button", role: "tab", "aria-selected": tab === "overview", onClick: () => setTab("overview"), children: "概览" }), (0, import_jsx_runtime4.jsx)("button", { type: "button", role: "tab", "aria-selected": tab === "resources", onClick: () => setTab("resources"), children: "资源" })] }), tab === "overview" ? (0, import_jsx_runtime4.jsx)(Overview, { tool: current, onRefresh: () => {
    void refresh();
  }, refreshing }) : (0, import_jsx_runtime4.jsx)(ToolResources, { tool, client })] }) });
}
function ToolList({ groups, expansion, onToggle, client }) {
  const [detail, setDetail] = (0, import_react5.useState)(null);
  const [configuration, setConfiguration] = (0, import_react5.useState)(null);
  if (groups.length === 0)
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.empty, children: "没有可用的工具能力" });
  return (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.toolList, children: [groups.map((group) => {
    const defaultTool = defaultToolForGroup(group);
    if (defaultTool === void 0)
      return null;
    const isExpanded = expansion.expandedGroupIds.includes(group.id);
    const groupConfiguration = group.tools.find((tool) => tool.configuration?.required)?.configuration;
    return (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.toolGroup, "aria-label": group.displayName, children: [(0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.groupHeader, children: [(0, import_jsx_runtime4.jsxs)("button", { type: "button", className: ToolLibraryView_default.groupToggle, "aria-label": `${isExpanded ? "收起" : "展开"}能力组：${group.displayName}`, "aria-expanded": isExpanded, onClick: () => onToggle(group.id), children: [(0, import_jsx_runtime4.jsx)("span", { className: ToolLibraryView_default.groupIcon, children: (0, import_jsx_runtime4.jsx)(ToolIcon, { toolId: defaultTool.id, groupIconKey: group.iconKey, size: 15 }) }), (0, import_jsx_runtime4.jsxs)("span", { className: ToolLibraryView_default.groupIdentity, children: [(0, import_jsx_runtime4.jsx)("strong", { children: group.displayName }), (0, import_jsx_runtime4.jsx)("span", { children: group.description ?? "AI 团队会按任务需要自行使用" })] }), (0, import_jsx_runtime4.jsx)(ChevronRight, { className: ToolLibraryView_default.groupChevron, "data-expanded": isExpanded ? "true" : "false", size: 15, "aria-hidden": "true" })] }), groupConfiguration && (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": `配置 ${group.displayName}`, title: `配置 ${group.displayName}`, onClick: () => setConfiguration(groupConfiguration), children: (0, import_jsx_runtime4.jsx)(Settings, { size: 14 }) })] }), isExpanded && (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.groupChildren, children: [group.id === "douyin-publisher" && (0, import_jsx_runtime4.jsx)(DouyinAccountButton, { client }), group.tools.map((tool) => (0, import_jsx_runtime4.jsxs)("button", { type: "button", className: ToolLibraryView_default.toolItem, "data-nested": "true", onClick: () => setDetail(tool), "aria-label": `查看 ${tool.displayName} 详情`, children: [(0, import_jsx_runtime4.jsxs)("span", { className: ToolLibraryView_default.toolIdentity, children: [(0, import_jsx_runtime4.jsx)("strong", { children: tool.displayName }), (0, import_jsx_runtime4.jsx)("span", { children: tool.effect === "paid" ? "需要老板确认后使用" : "由 AI 团队自动安排" })] }), (0, import_jsx_runtime4.jsx)("span", { className: ToolLibraryView_default.healthDot, "data-health": tool.health.status, "aria-label": `健康状态：${HEALTH_LABEL[tool.health.status]}` })] }, `${tool.id}:${tool.version}`))] })] }, group.id);
  }), detail && (0, import_jsx_runtime4.jsx)(ToolDetailModal, { tool: detail, client, onClose: () => setDetail(null) }), configuration && (0, import_jsx_runtime4.jsx)(ProviderConfigurationModal, { metadata: configuration, client, onClose: () => setConfiguration(null) })] });
}
function Overview({ tool, onRefresh, refreshing }) {
  return (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.tabBody, children: [(0, import_jsx_runtime4.jsx)("p", { className: ToolLibraryView_default.description, children: tool.description }), (0, import_jsx_runtime4.jsxs)("dl", { className: ToolLibraryView_default.factGrid, children: [(0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "健康" }), (0, import_jsx_runtime4.jsxs)("dd", { "data-health": tool.health.status, children: [(0, import_jsx_runtime4.jsx)(HeartPulse, { size: 13 }), HEALTH_LABEL[tool.health.status]] })] }), (0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "执行" }), (0, import_jsx_runtime4.jsx)("dd", { children: tool.executionMode === "async" ? "异步任务" : "同步返回" })] }), (0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "费用" }), (0, import_jsx_runtime4.jsxs)("dd", { children: [(0, import_jsx_runtime4.jsx)(CircleDollarSign, { size: 13 }), EFFECT_LABEL[tool.effect]] })] }), (0, import_jsx_runtime4.jsxs)("div", { children: [(0, import_jsx_runtime4.jsx)("dt", { children: "成功率" }), (0, import_jsx_runtime4.jsx)("dd", { children: "尚无样本" })] })] }), (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.detailSection, children: [(0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.sectionTitle, children: [(0, import_jsx_runtime4.jsx)("h4", { children: "能力" }), (0, import_jsx_runtime4.jsx)("button", { type: "button", className: ToolLibraryView_default.iconButton, "aria-label": "刷新健康状态", title: "刷新健康状态", onClick: onRefresh, disabled: refreshing, children: (0, import_jsx_runtime4.jsx)(RefreshCw, { size: 14 }) })] }), (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.tags, children: tool.capabilityTags.map((tag) => (0, import_jsx_runtime4.jsx)("span", { children: tag }, tag)) })] }), (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.detailSection, children: [(0, import_jsx_runtime4.jsx)("h4", { children: "限制与费用" }), (0, import_jsx_runtime4.jsxs)("p", { children: [tool.costPolicy.currency, " ", tool.costPolicy.estimated.toFixed(2), " 预估，上限 ", tool.costPolicy.maximum.toFixed(2), tool.costPolicy.unit ? ` / ${tool.costPolicy.unit}` : ""] })] }), (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.detailSection, children: [(0, import_jsx_runtime4.jsx)("h4", { children: "输入 Schema" }), (0, import_jsx_runtime4.jsx)("pre", { children: JSON.stringify(tool.inputSchema, null, 2) })] }), (0, import_jsx_runtime4.jsxs)("section", { className: ToolLibraryView_default.detailSection, children: [(0, import_jsx_runtime4.jsx)("h4", { children: "输出 Schema" }), (0, import_jsx_runtime4.jsx)("pre", { children: JSON.stringify(tool.outputSchema, null, 2) })] })] });
}
function ToolLibraryView({ sessionId, client, conversationId, runId }) {
  const [tools, setTools] = (0, import_react5.useState)([]);
  const [expansion, setExpansion] = (0, import_react5.useState)(() => createToolGroupExpansionState(sessionId, []));
  const [state, setState] = (0, import_react5.useState)("loading");
  (0, import_react5.useEffect)(() => {
    const controller = new AbortController();
    setState("loading");
    setTools([]);
    setExpansion(createToolGroupExpansionState(sessionId, []));
    void client.listTools(controller.signal).then((next) => {
      if (controller.signal.aborted)
        return;
      const nextGroups = groupTools(next);
      setTools(next);
      setExpansion(createToolGroupExpansionState(sessionId, nextGroups.map((group) => group.id)));
      setState("ready");
    }).catch(() => {
      if (!controller.signal.aborted)
        setState("error");
    });
    return () => controller.abort();
  }, [client, sessionId]);
  const groups = (0, import_react5.useMemo)(() => groupTools(tools), [tools]);
  (0, import_react5.useEffect)(() => {
    setExpansion((current) => reconcileToolGroupExpansionState(current, sessionId, groups.map((group) => group.id)));
  }, [groups, sessionId]);
  if (state === "loading")
    return (0, import_jsx_runtime4.jsx)("div", { className: ToolLibraryView_default.loadState, children: "正在加载工具库..." });
  if (state === "error")
    return (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.loadState, role: "alert", children: [(0, import_jsx_runtime4.jsx)("strong", { children: "工具库暂时无法加载" }), (0, import_jsx_runtime4.jsx)("span", { children: "服务端身份未配置或网关不可用。" })] });
  return (0, import_jsx_runtime4.jsxs)("div", { className: ToolLibraryView_default.root, "aria-label": "Agent 工具库", children: [(0, import_jsx_runtime4.jsxs)("header", { className: ToolLibraryView_default.libraryIntro, children: [(0, import_jsx_runtime4.jsx)("strong", { children: "能力清单" }), (0, import_jsx_runtime4.jsx)("span", { children: "AI 团队会根据您的任务自动选择合适能力，无需您手动操作。" })] }), (0, import_jsx_runtime4.jsx)(ToolList, { groups, expansion, onToggle: (groupId) => setExpansion((current) => toggleToolGroupExpansion(current, groupId)), client })] });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentProfilesView.js
var import_jsx_runtime6 = require("react/jsx-runtime");
var import_react7 = require("react");

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentProfilesView.module.css
var tagId4 = "@nanmicoder/dsh-agent-teams/AgentProfilesView.module.css";
if (typeof document !== "undefined" && !document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId4) + "]")) {
  const tag = document.createElement("style");
  tag.dataset.plugin = "@nanmicoder/dsh-agent-teams";
  tag.dataset.pluginCss = tagId4;
  tag.textContent = ".cGZX4G_root{min-width:0;color:var(--dsw-alias-label-primary);gap:10px;padding:10px 12px 14px;display:grid}.cGZX4G_header,.cGZX4G_detailTitle{justify-content:space-between;align-items:flex-start;gap:8px;display:flex}.cGZX4G_header strong,.cGZX4G_detailTitle strong{font-size:12px;line-height:17px;display:block}.cGZX4G_header span,.cGZX4G_header small,.cGZX4G_detailTitle small{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:14px;display:block}.cGZX4G_iconButton{width:26px;height:26px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:5px;justify-content:center;align-items:center;display:inline-flex}.cGZX4G_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.cGZX4G_list{gap:5px;display:grid}.cGZX4G_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);min-width:0;color:inherit;text-align:left;cursor:pointer;border-radius:6px;grid-template-columns:29px minmax(0,1fr) auto;align-items:center;gap:8px;padding:7px;display:grid}.cGZX4G_card:hover,.cGZX4G_card[data-selected=true]{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-brand-primary)}.cGZX4G_avatar{background:var(--dsw-alias-bg-layer-3);width:29px;height:29px;color:var(--dsw-alias-brand-primary);border-radius:7px;place-items:center;display:grid}.cGZX4G_identity{min-width:0}.cGZX4G_identity strong,.cGZX4G_identity small{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.cGZX4G_identity strong{font-size:10px;line-height:15px}.cGZX4G_identity small{color:var(--dsw-alias-label-tertiary);font-size:9px;line-height:13px}.cGZX4G_status{color:var(--dsw-alias-state-success-primary);align-items:center;gap:3px;font-size:9px;display:inline-flex}.cGZX4G_detail{border-top:1px solid var(--dsw-alias-border-l2);padding-top:10px}.cGZX4G_detailTitle{align-items:center}.cGZX4G_detailActions{align-items:center;gap:2px;display:inline-flex}.cGZX4G_detail p{color:var(--dsw-alias-label-secondary);margin:8px 0;font-size:10px;line-height:16px}.cGZX4G_tags{flex-wrap:wrap;gap:4px;display:flex}.cGZX4G_tags span{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 5px;font-size:9px;line-height:15px}.cGZX4G_sections{gap:8px;margin-top:10px;display:grid}.cGZX4G_sections h4{margin:0 0 3px;font-size:10px}.cGZX4G_sections ul{color:var(--dsw-alias-label-secondary);margin:0;padding-left:15px;font-size:9px;line-height:15px}.cGZX4G_soulSummary{color:var(--dsw-alias-label-secondary);margin:0;font-size:9px;line-height:15px}.cGZX4G_memories{border-top:1px solid var(--dsw-alias-border-l2);gap:6px;margin-top:11px;padding-top:9px;display:grid}.cGZX4G_memories h4{align-items:center;gap:5px;margin:0;font-size:10px;display:flex}.cGZX4G_memories>p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:9px}.cGZX4G_memoryList{gap:5px;display:grid}.cGZX4G_memory{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:5px;grid-template-columns:minmax(0,1fr) 26px;gap:2px 7px;padding:6px;display:grid}.cGZX4G_memory[data-status=diagnostic]{border-left:2px solid var(--dsw-alias-state-warning-primary)}.cGZX4G_memory[data-status=disabled]{opacity:.55}.cGZX4G_memory strong,.cGZX4G_memory small{text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.cGZX4G_memory strong{font-size:9px}.cGZX4G_memory small{color:var(--dsw-alias-label-tertiary);font-size:8px;line-height:13px}.cGZX4G_memory p{grid-column:1/-1;margin:1px 0 0;font-size:9px;line-height:14px}.cGZX4G_confirm{border-left:2px solid var(--dsw-alias-state-success-primary);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary);align-items:flex-start;gap:5px;margin-top:10px;padding:7px;font-size:9px;line-height:14px;display:flex}.cGZX4G_empty{min-height:130px;color:var(--dsw-alias-label-tertiary);text-align:center;place-items:center;gap:6px;font-size:10px;display:grid}.cGZX4G_empty span{color:var(--dsw-alias-label-secondary)}.cGZX4G_empty small{max-width:220px;font-size:9px;line-height:14px}.cGZX4G_error{color:var(--dsw-alias-state-error-primary);font-size:10px;line-height:15px}.cGZX4G_editor{border:1px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2);border-radius:6px;gap:7px;margin-top:10px;padding:8px;display:grid}.cGZX4G_editor label{color:var(--dsw-alias-label-secondary);gap:3px;font-size:9px;line-height:13px;display:grid}.cGZX4G_editor label small{color:var(--dsw-alias-label-tertiary);font-size:8px}.cGZX4G_editor input,.cGZX4G_editor textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:4px;outline:none;font-size:10px;line-height:15px}.cGZX4G_editor input{height:27px;padding:4px 6px}.cGZX4G_editor textarea{resize:vertical;min-height:48px;padding:5px 6px}.cGZX4G_editor input:focus,.cGZX4G_editor textarea:focus{border-color:var(--dsw-alias-brand-primary)}.cGZX4G_editorActions{justify-content:flex-end;gap:5px;padding-top:2px;display:flex}.cGZX4G_editorActions button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);min-height:25px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:4px;align-items:center;gap:3px;padding:0 8px;font-size:9px;display:inline-flex}.cGZX4G_editorActions button[type=submit]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.cGZX4G_editorActions button:disabled{opacity:.5;cursor:wait}.cGZX4G_surfaceTabs,.cGZX4G_filterBar{background:var(--dsw-alias-bg-layer-2);border-radius:6px;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;padding:3px;display:grid}.cGZX4G_surfaceTabs button,.cGZX4G_filterBar button{min-width:0;height:25px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:4px;font-size:9px}.cGZX4G_surfaceTabs button[aria-selected=true],.cGZX4G_filterBar button[aria-selected=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l2)}.cGZX4G_sharedRoot{gap:9px;min-width:0;display:grid}.cGZX4G_filterBar{grid-template-columns:repeat(4,minmax(0,1fr))}.cGZX4G_sharedList{gap:5px;display:grid}.cGZX4G_sharedItem,.cGZX4G_skillItem{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;gap:5px;padding:7px;display:grid}.cGZX4G_sharedItem[data-status=suggested]{border-left:2px solid var(--dsw-alias-state-warning-primary)}.cGZX4G_sharedItem[data-status=active]{border-left:2px solid var(--dsw-alias-state-success-primary)}.cGZX4G_sharedItem[data-status=archived],.cGZX4G_sharedItem[data-status=rejected],.cGZX4G_skillItem[data-status=rejected]{opacity:.62}.cGZX4G_sharedMeta{justify-content:space-between;align-items:center;gap:6px;min-width:0;display:flex}.cGZX4G_sharedMeta strong{font-size:9px}.cGZX4G_sharedMeta span,.cGZX4G_skillItem small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:8px;overflow:hidden}.cGZX4G_sharedItem p,.cGZX4G_skillItem p,.cGZX4G_skillCandidates>p{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:9px;line-height:14px}.cGZX4G_actionRow{flex-wrap:wrap;gap:4px;display:flex}.cGZX4G_actionRow button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-height:23px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:4px;align-items:center;gap:3px;padding:0 7px;font-size:8px;display:inline-flex}.cGZX4G_actionRow button:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.cGZX4G_actionRow button:disabled{cursor:wait;opacity:.5}.cGZX4G_skillCandidates{border-top:1px solid var(--dsw-alias-border-l2);gap:5px;padding-top:8px;display:grid}.cGZX4G_skillCandidates h4{align-items:center;gap:5px;margin:0;font-size:10px;display:flex}.cGZX4G_skillItem>div:first-child{gap:1px;min-width:0;display:grid}.cGZX4G_skillItem strong{overflow-wrap:anywhere;font-size:9px}";
  document.head.appendChild(tag);
}
var AgentProfilesView_default = { "actionRow": "cGZX4G_actionRow", "avatar": "cGZX4G_avatar", "card": "cGZX4G_card", "confirm": "cGZX4G_confirm", "detail": "cGZX4G_detail", "detailActions": "cGZX4G_detailActions", "detailTitle": "cGZX4G_detailTitle", "editor": "cGZX4G_editor", "editorActions": "cGZX4G_editorActions", "empty": "cGZX4G_empty", "error": "cGZX4G_error", "filterBar": "cGZX4G_filterBar", "header": "cGZX4G_header", "iconButton": "cGZX4G_iconButton", "identity": "cGZX4G_identity", "list": "cGZX4G_list", "memories": "cGZX4G_memories", "memory": "cGZX4G_memory", "memoryList": "cGZX4G_memoryList", "root": "cGZX4G_root", "sections": "cGZX4G_sections", "sharedItem": "cGZX4G_sharedItem", "sharedList": "cGZX4G_sharedList", "sharedMeta": "cGZX4G_sharedMeta", "sharedRoot": "cGZX4G_sharedRoot", "skillCandidates": "cGZX4G_skillCandidates", "skillItem": "cGZX4G_skillItem", "soulSummary": "cGZX4G_soulSummary", "status": "cGZX4G_status", "surfaceTabs": "cGZX4G_surfaceTabs", "tags": "cGZX4G_tags" };

// packages/opc-profile/agent-teams-desktop/source/lib/client/SharedMemoryView.js
var import_jsx_runtime5 = require("react/jsx-runtime");
var import_react6 = require("react");
var TRACK_LABEL = {
  user_identity: "用户身份",
  company: "公司记忆",
  industry: "行业经验",
  recent_plan: "近期计划",
  activity_log: "运行日志"
};
var STATUS_LABEL = {
  suggested: "待确认",
  active: "已生效",
  archived: "已归档",
  rejected: "已拒绝"
};
function SharedMemoryView({ client }) {
  const [memories, setMemories] = (0, import_react6.useState)([]);
  const [skills, setSkills] = (0, import_react6.useState)([]);
  const [filter, setFilter] = (0, import_react6.useState)("all");
  const [loading, setLoading] = (0, import_react6.useState)(true);
  const [busyId, setBusyId] = (0, import_react6.useState)(null);
  const [message, setMessage] = (0, import_react6.useState)(null);
  const load = () => {
    setLoading(true);
    setMessage(null);
    void Promise.all([client.listSharedMemories(), client.listSkillCandidates()]).then(([nextMemories, nextSkills]) => {
      setMemories(nextMemories);
      setSkills(nextSkills);
    }).catch(() => {
      setMemories([]);
      setSkills([]);
    }).finally(() => setLoading(false));
  };
  (0, import_react6.useEffect)(load, [client]);
  const visible = (0, import_react6.useMemo)(() => filter === "all" ? memories : memories.filter((item) => item.status === filter), [filter, memories]);
  const decideMemory = async (memory, decision) => {
    setBusyId(memory.id);
    setMessage(null);
    try {
      const next = await client.decideSharedMemory(memory.id, decision, memory.version);
      setMemories((items) => items.map((item) => item.id === next.id ? next : item));
    } catch {
      setMessage("记忆状态已变化，请刷新后重试");
    } finally {
      setBusyId(null);
    }
  };
  const decideSkill = async (skill, decision) => {
    setBusyId(skill.id);
    setMessage(null);
    try {
      const next = await client.decideSkillCandidate(skill.id, decision, skill.version);
      setSkills((items) => items.map((item) => item.id === next.id ? next : item));
    } catch {
      setMessage("Skill 候选状态已变化，请刷新后重试");
    } finally {
      setBusyId(null);
    }
  };
  return (0, import_jsx_runtime5.jsxs)("section", { className: AgentProfilesView_default.sharedRoot, "aria-label": "CEO 共享记忆", children: [(0, import_jsx_runtime5.jsxs)("header", { className: AgentProfilesView_default.header, children: [(0, import_jsx_runtime5.jsxs)("div", { children: [(0, import_jsx_runtime5.jsx)("strong", { children: "CEO 共享记忆" }), (0, import_jsx_runtime5.jsx)("span", { children: "组长共享；部门 Agent 的专业记忆仍彼此隔离" })] }), (0, import_jsx_runtime5.jsx)("button", { type: "button", className: AgentProfilesView_default.iconButton, "aria-label": "刷新共享记忆", title: "刷新共享记忆", onClick: load, children: (0, import_jsx_runtime5.jsx)(RefreshCw, { size: 14 }) })] }), (0, import_jsx_runtime5.jsx)("div", { className: AgentProfilesView_default.filterBar, role: "tablist", "aria-label": "记忆状态", children: ["all", "suggested", "active", "archived"].map((status) => (0, import_jsx_runtime5.jsx)("button", { type: "button", role: "tab", "aria-selected": filter === status, onClick: () => setFilter(status), children: status === "all" ? "全部" : STATUS_LABEL[status] }, status)) }), loading ? (0, import_jsx_runtime5.jsx)("div", { className: AgentProfilesView_default.empty, children: "正在读取 CEO 共享记忆..." }) : visible.length === 0 ? (0, import_jsx_runtime5.jsxs)("div", { className: AgentProfilesView_default.empty, children: [(0, import_jsx_runtime5.jsx)(Brain, { size: 22 }), (0, import_jsx_runtime5.jsx)("span", { children: "暂无此类记忆" }), (0, import_jsx_runtime5.jsx)("small", { children: "Agent 提出的长期事实会先进入待确认列表。" })] }) : (0, import_jsx_runtime5.jsx)("div", { className: AgentProfilesView_default.sharedList, children: visible.map((memory) => (0, import_jsx_runtime5.jsxs)("article", { className: AgentProfilesView_default.sharedItem, "data-status": memory.status, children: [(0, import_jsx_runtime5.jsxs)("div", { className: AgentProfilesView_default.sharedMeta, children: [(0, import_jsx_runtime5.jsx)("strong", { children: TRACK_LABEL[memory.track] }), (0, import_jsx_runtime5.jsxs)("span", { children: [STATUS_LABEL[memory.status], " · 命中 ", memory.occurrenceCount, " 次 · 重要度 ", memory.importance] })] }), (0, import_jsx_runtime5.jsx)("p", { children: memory.content }), (0, import_jsx_runtime5.jsxs)("div", { className: AgentProfilesView_default.actionRow, children: [memory.status === "suggested" && (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [(0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === memory.id, onClick: () => {
    void decideMemory(memory, "accepted");
  }, children: [(0, import_jsx_runtime5.jsx)(Check, { size: 12 }), "接受"] }), (0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === memory.id, onClick: () => {
    void decideMemory(memory, "rejected");
  }, children: [(0, import_jsx_runtime5.jsx)(X, { size: 12 }), "拒绝"] })] }), memory.status === "active" && (0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === memory.id, onClick: () => {
    void decideMemory(memory, "archived");
  }, children: [(0, import_jsx_runtime5.jsx)(Archive, { size: 12 }), "归档"] }), memory.status === "archived" && (0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === memory.id, onClick: () => {
    void decideMemory(memory, "accepted");
  }, children: [(0, import_jsx_runtime5.jsx)(RotateCcw, { size: 12 }), "恢复"] })] })] }, memory.id)) }), (0, import_jsx_runtime5.jsxs)("section", { className: AgentProfilesView_default.skillCandidates, "aria-label": "Skill 候选", children: [(0, import_jsx_runtime5.jsxs)("h4", { children: [(0, import_jsx_runtime5.jsx)(Sparkles, { size: 13 }), "Skill 候选"] }), skills.length === 0 ? (0, import_jsx_runtime5.jsx)("p", { children: "重复出现的可复用成功方法会在这里等待确认。" }) : skills.map((skill) => (0, import_jsx_runtime5.jsxs)("article", { className: AgentProfilesView_default.skillItem, "data-status": skill.status, children: [(0, import_jsx_runtime5.jsxs)("div", { children: [(0, import_jsx_runtime5.jsx)("strong", { children: skill.name }), (0, import_jsx_runtime5.jsxs)("small", { children: [skill.status === "pending" ? "待确认" : skill.status === "approved" ? "已批准" : "已拒绝", " · 重复 ", skill.occurrenceCount, " 次"] })] }), (0, import_jsx_runtime5.jsx)("p", { children: skill.description }), skill.status === "pending" && (0, import_jsx_runtime5.jsxs)("div", { className: AgentProfilesView_default.actionRow, children: [(0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === skill.id, onClick: () => {
    void decideSkill(skill, "approved");
  }, children: [(0, import_jsx_runtime5.jsx)(Check, { size: 12 }), "批准"] }), (0, import_jsx_runtime5.jsxs)("button", { type: "button", disabled: busyId === skill.id, onClick: () => {
    void decideSkill(skill, "rejected");
  }, children: [(0, import_jsx_runtime5.jsx)(X, { size: 12 }), "拒绝"] })] })] }, skill.id))] }), message && (0, import_jsx_runtime5.jsx)("div", { className: AgentProfilesView_default.error, role: "alert", children: message })] });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/AgentProfilesView.js
function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
function visibleRoleLabel(role) {
  const value = role.trim();
  return /\p{Script=Han}/u.test(value) ? value : "";
}
function lines(values) {
  return values.join("\n");
}
function toLines(value) {
  return value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
}
function toDraft(profile) {
  const version = profile.version;
  return {
    name: profile.name,
    description: profile.description,
    role: profile.role,
    industry: profile.industry ?? null,
    tags: profile.tags,
    persona: version?.persona ?? "",
    soulMarkdown: version?.soulMarkdown ?? null,
    soulSummary: version?.soulSummary ?? null,
    responsibilities: version?.responsibilities ?? [],
    preferredTools: version?.preferredTools ?? [],
    operatingRules: version?.operatingRules ?? [],
    avoidanceRules: version?.avoidanceRules ?? [],
    modelRoute: version?.modelRoute ?? null
  };
}
function AgentProfilesView({ client }) {
  const [surface, setSurface] = (0, import_react7.useState)("profiles");
  const [profiles, setProfiles] = (0, import_react7.useState)([]);
  const [selected, setSelected] = (0, import_react7.useState)(null);
  const [loading, setLoading] = (0, import_react7.useState)(true);
  const [message, setMessage] = (0, import_react7.useState)(null);
  const [memories, setMemories] = (0, import_react7.useState)([]);
  const [memoriesLoading, setMemoriesLoading] = (0, import_react7.useState)(false);
  const [editing, setEditing] = (0, import_react7.useState)(false);
  const [saving, setSaving] = (0, import_react7.useState)(false);
  const [draft, setDraft] = (0, import_react7.useState)(null);
  const load = () => {
    setLoading(true);
    setMessage(null);
    void client.listAgentProfiles("active").then((next) => {
      setProfiles(next);
      setSelected((current) => current === null ? next[0] ?? null : next.find((item) => item.id === current.id) ?? next[0] ?? null);
    }).catch(() => {
      setProfiles([]);
      setSelected(null);
    }).finally(() => setLoading(false));
  };
  (0, import_react7.useEffect)(load, [client]);
  (0, import_react7.useEffect)(() => {
    if (selected === null) {
      setMemories([]);
      return;
    }
    setMemoriesLoading(true);
    void client.listAgentMemories(selected.id).then(setMemories).catch(() => setMessage("角色记忆暂时无法加载")).finally(() => setMemoriesLoading(false));
  }, [client, selected?.id]);
  const disable = async () => {
    if (selected === null)
      return;
    try {
      await client.disableAgentProfile(selected.id);
      setProfiles((items) => items.filter((item) => item.id !== selected.id));
      setSelected(null);
    } catch {
      setMessage("停用 Agent 失败，请稍后重试");
    }
  };
  const disableMemory = async (memoryId) => {
    if (selected === null)
      return;
    try {
      await client.disableAgentMemory(selected.id, memoryId);
      setMemories((items) => items.map((item) => item.id === memoryId ? { ...item, status: "disabled" } : item));
    } catch {
      setMessage("停用记忆失败，请稍后重试");
    }
  };
  if (loading)
    return (0, import_jsx_runtime6.jsx)("div", { className: AgentProfilesView_default.empty, children: "正在读取成长 Agent..." });
  return (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.root, "aria-label": "我的 Agent", children: [(0, import_jsx_runtime6.jsxs)("header", { className: AgentProfilesView_default.header, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: "我的 Agent" }), (0, import_jsx_runtime6.jsx)("span", { children: "任务中成长并可复用的租户私有角色" })] }), (0, import_jsx_runtime6.jsx)("button", { type: "button", className: AgentProfilesView_default.iconButton, "aria-label": "刷新 Agent", title: "刷新 Agent", onClick: load, children: (0, import_jsx_runtime6.jsx)(RefreshCw, { size: 14 }) })] }), (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.surfaceTabs, role: "tablist", "aria-label": "Agent 记忆视图", children: [(0, import_jsx_runtime6.jsx)("button", { type: "button", role: "tab", "aria-selected": surface === "profiles", onClick: () => setSurface("profiles"), children: "角色库" }), (0, import_jsx_runtime6.jsx)("button", { type: "button", role: "tab", "aria-selected": surface === "memory", onClick: () => setSurface("memory"), children: "CEO 记忆" })] }), surface === "memory" ? (0, import_jsx_runtime6.jsx)(SharedMemoryView, { client }) : profiles.length === 0 ? (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.empty, children: [(0, import_jsx_runtime6.jsx)(Bot, { size: 22 }), (0, import_jsx_runtime6.jsx)("span", { children: "还没有成长 Agent" }), (0, import_jsx_runtime6.jsx)("small", { children: "当任务找不到合适角色时，Agent 会自动创建并发布。" })] }) : (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("div", { className: AgentProfilesView_default.list, children: profiles.map((profile) => (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: AgentProfilesView_default.card, "data-selected": selected?.id === profile.id, onClick: () => {
    setSelected(profile);
    setEditing(false);
    setDraft(null);
  }, children: [(0, import_jsx_runtime6.jsx)("span", { className: AgentProfilesView_default.avatar, children: (0, import_jsx_runtime6.jsx)(Bot, { size: 15 }) }), (0, import_jsx_runtime6.jsxs)("span", { className: AgentProfilesView_default.identity, children: [(0, import_jsx_runtime6.jsx)("strong", { children: profile.name }), (visibleRoleLabel(profile.role) !== "" || profile.industry) && (0, import_jsx_runtime6.jsxs)("small", { children: [visibleRoleLabel(profile.role), profile.industry ? `${visibleRoleLabel(profile.role) !== "" ? " · " : ""}${profile.industry}` : ""] })] }), (0, import_jsx_runtime6.jsxs)("span", { className: AgentProfilesView_default.status, children: [(0, import_jsx_runtime6.jsx)(CircleDot, { size: 10 }), "活跃"] })] }, profile.id)) }), selected !== null && (0, import_jsx_runtime6.jsxs)("section", { className: AgentProfilesView_default.detail, "aria-label": `Agent 详情：${selected.name}`, children: [(0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.detailTitle, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: selected.name }), (0, import_jsx_runtime6.jsxs)("small", { children: ["版本 v", selected.currentVersion, " · 使用 ", selected.usageCount, " 次 · 成功率 ", percent(selected.successRate)] })] }), (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.detailActions, children: [(0, import_jsx_runtime6.jsx)("button", { type: "button", className: AgentProfilesView_default.iconButton, "aria-label": "编辑 Agent", title: "编辑 Agent", onClick: () => {
    setDraft(toDraft(selected));
    setEditing(true);
    setMessage(null);
  }, children: (0, import_jsx_runtime6.jsx)(Pencil, { size: 14 }) }), (0, import_jsx_runtime6.jsx)("button", { type: "button", className: AgentProfilesView_default.iconButton, "aria-label": "停用 Agent", title: "停用 Agent", onClick: () => {
    void disable();
  }, children: (0, import_jsx_runtime6.jsx)(Ban, { size: 14 }) })] })] }), editing && draft !== null ? (0, import_jsx_runtime6.jsx)(ProfileEditor, { profile: selected, draft, saving, onChange: setDraft, onCancel: () => {
    setEditing(false);
    setDraft(null);
  }, onSave: () => {
    setSaving(true);
    setMessage(null);
    void client.updateAgentProfile(selected.id, draft).then((updated) => {
      setProfiles((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setEditing(false);
      setDraft(null);
    }).catch(() => setMessage("保存 Agent 配置失败，请检查模型格式或稍后重试")).finally(() => setSaving(false));
  } }) : (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [(0, import_jsx_runtime6.jsx)("p", { children: selected.description }), (0, import_jsx_runtime6.jsx)("div", { className: AgentProfilesView_default.tags, children: selected.tags.map((tag) => (0, import_jsx_runtime6.jsx)("span", { children: tag }, tag)) }), selected.version && (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.sections, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: "模型" }), (0, import_jsx_runtime6.jsx)("p", { className: AgentProfilesView_default.soulSummary, children: selected.version.modelRoute ?? "跟随当前组长模型" })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsxs)("h4", { children: ["SOUL 人格 · v", selected.version.version] }), (0, import_jsx_runtime6.jsx)("p", { className: AgentProfilesView_default.soulSummary, children: selected.version.soulSummary ?? selected.version.persona })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: "职责" }), (0, import_jsx_runtime6.jsx)("ul", { children: selected.version.responsibilities.map((item) => (0, import_jsx_runtime6.jsx)("li", { children: item }, item)) })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: "运行规则" }), (0, import_jsx_runtime6.jsx)("ul", { children: selected.version.operatingRules.map((item) => (0, import_jsx_runtime6.jsx)("li", { children: item }, item)) })] }), (0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("h4", { children: "避让规则" }), (0, import_jsx_runtime6.jsx)("ul", { children: selected.version.avoidanceRules.map((item) => (0, import_jsx_runtime6.jsx)("li", { children: item }, item)) })] })] })] }), (0, import_jsx_runtime6.jsxs)("section", { className: AgentProfilesView_default.memories, "aria-label": "我的记忆", children: [(0, import_jsx_runtime6.jsxs)("h4", { children: [(0, import_jsx_runtime6.jsx)(Brain, { size: 13 }), "我的记忆"] }), memoriesLoading ? (0, import_jsx_runtime6.jsx)("p", { children: "正在读取角色记忆..." }) : memories.length === 0 ? (0, import_jsx_runtime6.jsx)("p", { children: "暂无可查看的角色记忆。" }) : (0, import_jsx_runtime6.jsx)("div", { className: AgentProfilesView_default.memoryList, children: memories.map((memory) => (0, import_jsx_runtime6.jsxs)("article", { className: AgentProfilesView_default.memory, "data-status": memory.status, children: [(0, import_jsx_runtime6.jsxs)("div", { children: [(0, import_jsx_runtime6.jsx)("strong", { children: memoryLabel(memory.type) }), (0, import_jsx_runtime6.jsxs)("small", { children: ["命中 ", memory.occurrenceCount, " 次 · 引用 ", memory.usageCount, " 次", memory.sourceRunId ? ` · Run ${memory.sourceRunId.slice(0, 8)}` : ""] })] }), (0, import_jsx_runtime6.jsx)("button", { type: "button", className: AgentProfilesView_default.iconButton, "aria-label": "停用记忆", title: "停用记忆", disabled: memory.status === "disabled", onClick: () => {
    void disableMemory(memory.id);
  }, children: (0, import_jsx_runtime6.jsx)(Ban, { size: 13 }) }), (0, import_jsx_runtime6.jsx)("p", { children: memory.content })] }, memory.id)) })] }), (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.confirm, children: [(0, import_jsx_runtime6.jsx)(CircleCheck, { size: 14 }), "保存会生成新版本，只影响后续任务；正在执行的团队成员继续使用原版本。"] })] })] }), message && (0, import_jsx_runtime6.jsx)("div", { className: AgentProfilesView_default.error, role: "alert", children: message })] });
}
function ProfileEditor({ profile, draft, saving, onChange, onCancel, onSave }) {
  const update = (changes) => onChange({ ...draft, ...changes });
  return (0, import_jsx_runtime6.jsxs)("form", { className: AgentProfilesView_default.editor, "aria-label": `编辑 Agent：${profile.name}`, onSubmit: (event) => {
    event.preventDefault();
    onSave();
  }, children: [(0, import_jsx_runtime6.jsxs)("label", { children: ["名称", (0, import_jsx_runtime6.jsx)("input", { value: draft.name, maxLength: 80, onChange: (event) => update({ name: event.target.value }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["岗位", (0, import_jsx_runtime6.jsx)("input", { value: draft.role, maxLength: 160, onChange: (event) => update({ role: event.target.value }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["简介", (0, import_jsx_runtime6.jsx)("textarea", { value: draft.description, maxLength: 500, onChange: (event) => update({ description: event.target.value }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["模型 ", (0, import_jsx_runtime6.jsx)("small", { children: "服务商/模型" }), (0, import_jsx_runtime6.jsx)("input", { value: draft.modelRoute ?? "", placeholder: "deepseek-official/deepseek-v4-flash", onChange: (event) => update({ modelRoute: event.target.value.trim() || null }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["人格", (0, import_jsx_runtime6.jsx)("textarea", { value: draft.persona, maxLength: 12e3, onChange: (event) => update({ persona: event.target.value }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["职责 ", (0, import_jsx_runtime6.jsx)("small", { children: "每行一条" }), (0, import_jsx_runtime6.jsx)("textarea", { value: lines(draft.responsibilities), onChange: (event) => update({ responsibilities: toLines(event.target.value) }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["常用工具 ", (0, import_jsx_runtime6.jsx)("small", { children: "逗号分隔" }), (0, import_jsx_runtime6.jsx)("input", { value: draft.preferredTools.join(", "), onChange: (event) => update({ preferredTools: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["执行规则 ", (0, import_jsx_runtime6.jsx)("small", { children: "每行一条" }), (0, import_jsx_runtime6.jsx)("textarea", { value: lines(draft.operatingRules), onChange: (event) => update({ operatingRules: toLines(event.target.value) }) })] }), (0, import_jsx_runtime6.jsxs)("label", { children: ["避让规则 ", (0, import_jsx_runtime6.jsx)("small", { children: "每行一条" }), (0, import_jsx_runtime6.jsx)("textarea", { value: lines(draft.avoidanceRules), onChange: (event) => update({ avoidanceRules: toLines(event.target.value) }) })] }), (0, import_jsx_runtime6.jsxs)("div", { className: AgentProfilesView_default.editorActions, children: [(0, import_jsx_runtime6.jsxs)("button", { type: "button", onClick: onCancel, disabled: saving, children: [(0, import_jsx_runtime6.jsx)(X, { size: 13 }), "取消"] }), (0, import_jsx_runtime6.jsxs)("button", { type: "submit", disabled: saving || draft.name.trim() === "" || draft.role.trim() === "" || draft.persona.trim() === "", children: [(0, import_jsx_runtime6.jsx)(Save, { size: 13 }), saving ? "保存中" : "保存新版本"] })] })] });
}
function memoryLabel(type) {
  return { best_practice: "已掌握的长期做法", role_preference: "角色偏好", risk_avoidance: "风险规避", task_log: "任务日志", failure_reflection: "失败反思" }[type];
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/ActivityPanel.js
var AUTOCLOSE_GRACE_MS = 2e3;
var AUTO_OPEN_SETTLE_MS = 4e3;
var PANEL_OPEN_ATTRIBUTE = "data-agent-teams-panel-open";
function memberInitial(name) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}
function visibleRoleLabel2(role) {
  const value = role.trim();
  return /\p{Script=Han}/u.test(value) ? value : "";
}
function stableHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index) | 0;
  }
  return Math.abs(hash);
}
var ACCENTS = [
  "var(--dsw-alias-state-business-primary)",
  "var(--dsw-alias-state-success)",
  "var(--dsw-alias-state-danger)",
  "var(--dsw-alias-state-warning)",
  "var(--dsw-alias-label-tertiary)"
];
function accentOf(id) {
  return ACCENTS[stableHash(id) % ACCENTS.length] ?? ACCENTS[0];
}
var TASK_STATUS_LABEL = {
  pending: "待领取",
  claimed: "已认领",
  in_progress: "进行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消"
};
function taskStatusLabel(status) {
  return TASK_STATUS_LABEL[status] ?? status;
}
function taskTimeLabel(value) {
  if (value === void 0 || !Number.isFinite(value))
    return "未开始";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}
function isTeamControlTool(id) {
  return id.startsWith("agent_teams_");
}
function MemberToolTrace({ member }) {
  const tools = groupToolIndicators(member.tools.filter((tool) => !isTeamControlTool(tool.id)));
  if (tools.length === 0)
    return null;
  return (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberToolTrace, "aria-label": `${member.name} 的工具调用`, children: tools.map((tool) => {
    const failureTitle = tool.failures === 0 ? "" : ` · ${tool.failures} 次失败${tool.lastError === void 0 ? "" : `：${tool.lastError}`}`;
    const toolNames = tool.labels.join("、");
    return (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberToolTag, "data-failed": tool.failures > 0, title: `${toolNames} · 合计调用 ${tool.calls} 次${failureTitle}`, children: [(0, import_jsx_runtime7.jsx)(ToolIcon, { toolId: tool.representativeId, size: 13 }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberToolCount, children: tool.calls }), tool.failures > 0 && (0, import_jsx_runtime7.jsx)(TriangleAlert, { className: ActivityPanel_default.memberToolFailure, size: 11, strokeWidth: 2.4, "aria-label": `${toolNames} 有 ${tool.failures} 次调用失败` })] }, tool.iconKey);
  }) });
}
function taskTone(state, status) {
  if (status === "failed")
    return "failed";
  if (status === "cancelled")
    return "cancelled";
  return state;
}
function Chevron({ open }) {
  return (0, import_jsx_runtime7.jsx)("svg", { className: ActivityPanel_default.chevron, "data-open": open, width: "9", height: "9", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", "aria-hidden": true, children: (0, import_jsx_runtime7.jsx)("path", { d: "M3.5 2l3 3-3 3" }) });
}
function WorkGlyph({ active }) {
  return (0, import_jsx_runtime7.jsx)("svg", { className: ActivityPanel_default.workGlyph, "data-active": active, width: "11", height: "11", viewBox: "0 0 11 11", fill: "currentColor", "aria-hidden": true, children: [[0, 0], [4.2, 0], [8.4, 0], [0, 4.2], [4.2, 4.2], [8.4, 4.2]].map(([x, y], index) => (0, import_jsx_runtime7.jsx)("rect", { x, y, width: "2.6", height: "2.6", rx: ".6", style: { animationDelay: `${index * 0.15}s` } }, `${x}:${y}`)) });
}
function CollapsedBadge({ count, busy, onClick }) {
  return (0, import_jsx_runtime7.jsxs)("button", { type: "button", className: ActivityPanel_default.badge, "data-busy": busy, onClick, "aria-label": `AgentTeams 活动，${count} 个团队`, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.badgeDot, "data-busy": busy, "aria-hidden": true }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.badgeCount, children: count })] });
}
function memberStateLabel(member, tasks, historic) {
  const owned = tasks.filter((task) => task.assignee === member.name);
  if (member.activity === "working")
    return "工作中";
  if (owned.some((task) => task.status === "failed"))
    return "有失败";
  if (owned.some((task) => task.state === "blocked"))
    return "等待";
  if (owned.length > 0 && owned.every((task) => task.status === "completed"))
    return "已交付";
  if (member.status === "removed")
    return historic ? "已离队" : "已移除";
  if (owned.length > 0)
    return "待执行";
  return "待派工";
}
function memberStatusText(member, tasks) {
  const owned = tasks.filter((task) => task.assignee === member.name);
  const current = owned.find((task) => task.id === member.currentTask);
  const blocked = owned.find((task) => task.state === "blocked");
  if (member.activity === "working" && current !== void 0)
    return `正在执行 ${current.id}`;
  if (member.activity === "working")
    return "正在处理已派任务";
  if (blocked !== void 0) {
    const dependency = tasks.find((task) => blocked.dependencies.includes(task.id) && task.state !== "completed");
    if (dependency !== void 0)
      return `等待 ${dependency.id} · ${dependency.assignee || "待认领"}`;
    return "等待前置任务";
  }
  if (member.total === 0)
    return "等待组长派工";
  if (member.done === member.total)
    return "任务已交付";
  return member.activity === "idle" ? "待继续执行" : "状态未知";
}
function compactTaskLabel(subject) {
  const withoutVerb = subject.replace(/^开发\s*/u, "").replace(/^\d+[-_.、\s]*/u, "");
  const head = withoutVerb.split(/[（(·：:]/u)[0]?.trim() ?? withoutVerb;
  return head.length > 18 ? `${head.slice(0, 17)}…` : head;
}
function taskSummary(team) {
  const completed = team.tasks.filter((task) => task.status === "completed");
  const running = team.tasks.filter((task) => task.state === "running");
  const blocked = team.tasks.filter((task) => task.state === "blocked");
  const ready = team.tasks.filter((task) => task.state === "open" && task.status !== "completed");
  if (team.tasks.length === 0)
    return "等待组长拆解任务";
  if (completed.length === team.tasks.length)
    return `全部 ${completed.length} 项任务已交付`;
  if (blocked.length > 0 && running.length > 0) {
    return `${blocked.slice(0, 3).map((task) => task.id).join("、")}${blocked.length > 3 ? ` 等 ${blocked.length} 项` : ""} 等待前置，其余已开工`;
  }
  if (running.length > 0)
    return `${running.map((task) => task.id).join("、")} 正在执行`;
  if (ready.length > 0)
    return `${ready.map((task) => task.id).join("、")} 已就绪待开工`;
  if (blocked.length > 0)
    return `${blocked.map((task) => task.id).join("、")} 等待前置`;
  return "等待下一轮调度";
}
function ProgressOverview({ team }) {
  const running = team.tasks.filter((task) => task.state === "running").length;
  const blocked = team.tasks.filter((task) => task.state === "blocked").length;
  const completed = team.tasks.filter((task) => task.status === "completed").length;
  const summaryTone = blocked > 0 ? "warning" : completed === team.tasks.length && team.tasks.length > 0 ? "completed" : "running";
  return (0, import_jsx_runtime7.jsxs)("section", { className: ActivityPanel_default.progressOverview, "aria-label": "团队总进度", "data-progress-summary": true, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.progressTitle, children: "总进度" }), team.tasks.length > 0 ? (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.progressSegments, "aria-hidden": true, children: team.tasks.map((task) => (0, import_jsx_runtime7.jsx)("span", { "data-state": taskTone(task.state, task.status) }, task.id)) }) : (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.progressEmpty }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.progressLegend, children: [(0, import_jsx_runtime7.jsxs)("span", { "data-state": "running", children: ["■ 进行中 ", running] }), (0, import_jsx_runtime7.jsxs)("span", { "data-state": "blocked", children: ["■ 等待依赖 ", blocked] }), (0, import_jsx_runtime7.jsxs)("span", { "data-state": "completed", children: ["■ 已交付 ", completed] })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.progressSummary, "data-state": summaryTone, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.progressSummaryDot }), (0, import_jsx_runtime7.jsx)("span", { children: taskSummary(team) })] })] });
}
function DependencyMap({ tasks }) {
  const [open, setOpen] = (0, import_react8.useState)(true);
  const [hoverTaskId, setHoverTaskId] = (0, import_react8.useState)(null);
  const [keyboardTaskId, setKeyboardTaskId] = (0, import_react8.useState)(null);
  const [pinnedTaskId, setPinnedTaskId] = (0, import_react8.useState)(null);
  const hoverTimer = (0, import_react8.useRef)(null);
  const focusedTaskId = dependencyFocusTaskId(pinnedTaskId, keyboardTaskId, hoverTaskId);
  const layout = (0, import_react8.useMemo)(() => compactDagLayout(tasks), [tasks]);
  const parallel = (0, import_react8.useMemo)(() => usesParallelTaskGrid(tasks), [tasks]);
  const related = (0, import_react8.useMemo)(() => focusedTaskId === null ? null : relatedTaskIds(focusedTaskId, tasks), [focusedTaskId, tasks]);
  const scheduleHover = (id) => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (id === null) {
      setHoverTaskId(null);
      return;
    }
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      setHoverTaskId(id);
    }, 180);
  };
  (0, import_react8.useEffect)(() => () => {
    if (hoverTimer.current !== null)
      clearTimeout(hoverTimer.current);
  }, []);
  (0, import_react8.useEffect)(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape")
        setPinnedTaskId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  if (tasks.length === 0)
    return null;
  const fallbackTask = tasks.find((task) => task.state === "blocked") ?? tasks.find((task) => task.state === "running") ?? tasks[0];
  const detailTask = tasks.find((task) => task.id === focusedTaskId) ?? fallbackTask;
  const waitingOn = detailTask.dependencies.filter((dependency) => tasks.find((task) => task.id === dependency)?.status !== "completed");
  const dependents = tasks.filter((task) => task.dependencies.includes(detailTask.id));
  return (0, import_jsx_runtime7.jsxs)("section", { className: ActivityPanel_default.dependencySection, "aria-label": "任务依赖链", "data-dependency-map": true, children: [(0, import_jsx_runtime7.jsxs)("header", { className: ActivityPanel_default.sectionHead, children: [(0, import_jsx_runtime7.jsxs)("button", { type: "button", className: ActivityPanel_default.sectionToggleTitle, onClick: () => {
    setOpen((current) => !current);
  }, "aria-expanded": open, children: [(0, import_jsx_runtime7.jsx)(Chevron, { open }), (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives.IconBranchOutline16, {}), " ", parallel ? "并行任务" : "任务依赖"] }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.sectionHint, children: pinnedTaskId === null ? parallel ? "无前后依赖 · 点击查看详情" : "悬停高亮依赖链 · 点击固定" : `${pinnedTaskId} 已固定 · Esc 取消` })] }), open && (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [(0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.dagViewport, children: (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.dagCanvas, "data-layout": parallel ? "parallel" : "dependency", style: parallel ? void 0 : { width: layout.width, height: layout.height }, children: [!parallel && (0, import_jsx_runtime7.jsx)("svg", { className: ActivityPanel_default.dagEdges, width: layout.width, height: layout.height, "aria-hidden": true, children: layout.edges.map((edge) => {
    const active = related !== null && related.has(edge.from) && related.has(edge.to);
    return (0, import_jsx_runtime7.jsx)("path", { d: edge.path, "data-active": active, "data-dimmed": related !== null && !active }, `${edge.from}:${edge.to}`);
  }) }), layout.nodes.map(({ task, x, y }) => (0, import_jsx_runtime7.jsxs)("button", { type: "button", className: ActivityPanel_default.dagNode, style: parallel ? { height: COMPACT_DAG_NODE_HEIGHT } : { left: x, top: y, width: COMPACT_DAG_NODE_WIDTH, height: COMPACT_DAG_NODE_HEIGHT }, "data-task-id": task.id, "data-state": taskTone(task.state, task.status), "data-focused": related?.has(task.id) ?? false, "data-dimmed": related !== null && !related.has(task.id), "aria-pressed": pinnedTaskId === task.id, title: `${task.id} · ${task.subject}`, onClick: () => {
    setPinnedTaskId((current) => current === task.id ? null : task.id);
  }, onMouseEnter: () => {
    scheduleHover(task.id);
  }, onMouseLeave: () => {
    scheduleHover(null);
  }, onFocus: () => {
    setKeyboardTaskId(task.id);
  }, onBlur: () => {
    setKeyboardTaskId(null);
  }, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.dagNodeHead, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.dagNodeDot }), task.id] }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.dagNodeLabel, children: compactTaskLabel(task.subject) }), task.state === "running" && (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.dagRunningState, "aria-label": "运行中", children: (0, import_jsx_runtime7.jsx)(WorkGlyph, { active: true }) })] }, task.id))] }) }), (0, import_jsx_runtime7.jsxs)("section", { className: ActivityPanel_default.taskDetail, "data-task-detail": detailTask.id, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.taskDetailHead, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskDetailId, children: detailTask.id }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskDetailSubject, title: detailTask.subject, children: detailTask.subject.replace(/^开发\s*/u, "") }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskDetailBadge, "data-state": taskTone(detailTask.state, detailTask.status), children: taskStatusLabel(detailTask.status) })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.taskDetailLine, children: [detailTask.assignee || "待认领", " · ", detailTask.status === "completed" ? "已完成并交付" : detailTask.dependencies.length === 0 ? "无前置，可立即开工" : waitingOn.length === 0 ? "前置已就绪，可开工" : `等待 ${waitingOn.join("、")}`] }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskDetailMeta, children: dependents.length === 0 ? "无下游任务" : `完成后解锁 ${dependents.map((task) => task.id).join("、")}` }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.taskTimes, children: [(0, import_jsx_runtime7.jsxs)("span", { children: ["任务开始：", taskTimeLabel(detailTask.startedAt)] }), detailTask.completedAt !== void 0 && (0, import_jsx_runtime7.jsxs)("span", { children: ["任务完成：", taskTimeLabel(detailTask.completedAt)] })] }), detailTask.artifacts.length > 0 && (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.taskArtifacts, "aria-label": "交付文件", children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskArtifactsLabel, children: "交付文件" }), detailTask.artifacts.map((artifact) => (0, import_jsx_runtime7.jsx)("a", { className: ActivityPanel_default.taskArtifactLink, href: artifact.url, download: artifact.name, title: `下载 ${artifact.name}`, children: artifact.name }, artifact.url))] })] })] })] });
}
function TeamSection({ team, onNavigate, historic = false }) {
  const [membersOpen, setMembersOpen] = (0, import_react8.useState)(true);
  const [teamSurface, setTeamSurface] = (0, import_react8.useState)("tasks");
  const busyCount = team.members.filter((member) => member.activity === "working").length;
  const assignedCount = team.tasks.filter((task) => task.assignee !== "").length;
  const completedCount = team.tasks.filter((task) => task.status === "completed").length;
  const allCompleted = team.tasks.length > 0 && completedCount === team.tasks.length;
  const teamStartedAt = team.tasks.reduce((earliest, task) => {
    const startedAt = task.startedAt ?? task.createdAt;
    return earliest === void 0 || startedAt < earliest ? startedAt : earliest;
  }, void 0);
  return (0, import_jsx_runtime7.jsxs)("section", { className: ActivityPanel_default.team, "data-team-id": team.teamId, children: [(0, import_jsx_runtime7.jsxs)("header", { className: ActivityPanel_default.teamHead, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.teamName, title: team.name, children: team.name }), historic && (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.historicPill, children: "已结束" }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.teamStats, children: [(0, import_jsx_runtime7.jsxs)("span", { "data-stat": "members", children: [team.members.length, " 成员"] }), (0, import_jsx_runtime7.jsxs)("span", { "data-stat": "tasks", children: [completedCount, "/", team.tasks.length, " 完成"] }), (0, import_jsx_runtime7.jsxs)("span", { "data-stat": "messages", children: [team.messageCount, " 消息"] })] })] }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.teamTabs, role: "tablist", "aria-label": `${team.name} 工作台`, children: [(0, import_jsx_runtime7.jsxs)("button", { type: "button", role: "tab", "aria-selected": teamSurface === "tasks", onClick: () => {
    setTeamSurface("tasks");
  }, children: ["任务 ", (0, import_jsx_runtime7.jsx)("span", { children: team.tasks.length })] }), (0, import_jsx_runtime7.jsxs)("button", { type: "button", role: "tab", "aria-selected": teamSurface === "chat", onClick: () => {
    setTeamSurface("chat");
  }, children: ["群聊 ", (0, import_jsx_runtime7.jsx)("span", { children: team.messageCount })] }), (0, import_jsx_runtime7.jsxs)("button", { type: "button", role: "tab", "aria-selected": teamSurface === "artifacts", onClick: () => {
    setTeamSurface("artifacts");
  }, children: ["交付区 ", (0, import_jsx_runtime7.jsx)("span", { children: team.tasks.reduce((count, task) => count + task.artifacts.length, 0) })] })] }), teamSurface === "chat" ? (0, import_jsx_runtime7.jsx)(TeamChatView, { team, historic }) : teamSurface === "artifacts" ? (0, import_jsx_runtime7.jsx)(TeamArtifactsView, { team }) : (0, import_jsx_runtime7.jsxs)("section", { className: ActivityPanel_default.delegationSection, "aria-label": "组长派工关系", "data-delegation-map": true, children: [(0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.hierarchySection, "data-section": "captain", children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.hierarchyLabel, children: "组长指挥" }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.captainNode, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.captainAvatar, children: (0, import_jsx_runtime7.jsx)("img", { className: ActivityPanel_default.leadAvatar, src: LEAD_ART, alt: "", "aria-hidden": true }) }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.captainInfo, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.captainLine, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.captainName, children: "组长" }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.captainRole, children: "拆解 · 派发 · 汇总" })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.captainSummary, children: ["已派发 ", assignedCount, " 项任务给 ", team.members.length, " 名成员"] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.captainStartedAt, children: ["开始：", taskTimeLabel(teamStartedAt)] })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.captainState, "data-busy": busyCount > 0, children: [(0, import_jsx_runtime7.jsx)(WorkGlyph, { active: busyCount > 0 }), busyCount > 0 ? `${busyCount} 人执行中` : allCompleted ? "已收齐" : "等待回报"] })] }), (0, import_jsx_runtime7.jsx)(ProgressOverview, { team })] }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.hierarchySection, "data-section": "members", children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.hierarchyLabel, children: "部门执行" }), (0, import_jsx_runtime7.jsxs)("button", { type: "button", className: ActivityPanel_default.membersToggle, onClick: () => {
    setMembersOpen((current) => !current);
  }, "aria-expanded": membersOpen, "data-members-toggle": true, children: [(0, import_jsx_runtime7.jsxs)("span", { children: [(0, import_jsx_runtime7.jsx)(Chevron, { open: membersOpen }), "成员 ", team.members.length] }), (0, import_jsx_runtime7.jsx)("span", { children: membersOpen ? "收起" : "展开" })] }), membersOpen && (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.delegationTree, children: [team.members.length === 0 && (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.emptyHint, children: "暂无成员，等待组长组建团队" }), team.members.map((member) => {
    const owned = team.tasks.filter((task) => task.assignee === member.name);
    const roleLabel = visibleRoleLabel2(member.role);
    return (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.memberBlock, "data-activity": member.activity, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberBranch, "aria-hidden": true, children: (0, import_jsx_runtime7.jsx)("span", {}) }), (0, import_jsx_runtime7.jsxs)("button", { type: "button", className: ActivityPanel_default.memberRow, "data-activity": member.activity, onClick: () => {
      if (member.id !== "")
        onNavigate(team.captainSessionId, member.id);
    }, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberAvatar, "data-unread": member.unread > 0, children: [memberArtUrl(member.name, member.role) !== null ? (0, import_jsx_runtime7.jsx)("img", { className: ActivityPanel_default.memberArt, src: memberArtUrl(member.name, member.role) ?? "", alt: "", "aria-hidden": true }) : (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberInitial, style: { background: accentOf(member.id) }, children: memberInitial(member.name) }), (0, import_jsx_runtime7.jsx)("img", { className: ActivityPanel_default.stateArt, "data-activity": member.activity, src: ACTION_ART[member.activity], alt: "", "aria-hidden": true })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberInfo, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberLine, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberName, children: member.name }), roleLabel !== "" && (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.memberRole, children: roleLabel }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberState, "data-activity": member.activity, children: [(0, import_jsx_runtime7.jsx)(WorkGlyph, { active: member.activity === "working" }), memberStateLabel(member, team.tasks, historic)] })] }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberStatusLine, children: [memberStatusText(member, team.tasks), member.soulSummary !== void 0 && (0, import_jsx_runtime7.jsxs)("span", { title: member.soulSummary, children: [" · SOUL v", member.soulVersion ?? member.agentVersion ?? 1] }), member.agentId !== void 0 && (0, import_jsx_runtime7.jsxs)("span", { title: member.selectionReason ?? "已绑定可复用 Agent 角色", children: [" · Agent ", member.agentId.slice(0, 8), member.agentVersion === void 0 ? "" : ` v${member.agentVersion}`] })] })] }), (0, import_jsx_runtime7.jsx)(MemberToolTrace, { member }), (0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.memberCount, children: [member.done, "/", member.total] })] }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.assignmentLine, children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.assignmentLabel, children: "组长派发" }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.assignmentTasks, children: owned.length === 0 ? (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.taskEmpty, children: "暂无任务" }) : owned.map((task) => (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.assignmentChip, "data-state": taskTone(task.state, task.status), title: task.subject, children: task.id }, task.id)) })] })] }, member.id);
  })] })] }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.hierarchySection, "data-section": "tasks", children: [(0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.hierarchyLabel, children: "任务链路" }), (0, import_jsx_runtime7.jsx)(DependencyMap, { tasks: team.tasks })] })] })] });
}
function historicCardTeam(data, owner) {
  return {
    workspace: "",
    teamId: data.teamId,
    name: data.teamName,
    captainSessionId: data.captainSessionId || owner,
    members: data.members.map((member) => ({
      ...member,
      status: "removed",
      activity: "idle",
      progress: 0,
      done: 0,
      total: 0,
      currentTask: "",
      unread: 0,
      tools: []
    })),
    tasks: [],
    messageCount: 0,
    recentMessages: [],
    captainInbox: []
  };
}
function ActivityPanel({ sessionsList, openMemberSession, createToolClient }) {
  const navigateToMember = (captainSessionId, memberSessionId) => {
    setOpen(false);
    setWasActive(false);
    void openMemberSession(captainSessionId, memberSessionId);
  };
  const [open, setOpen] = (0, import_react8.useState)(false);
  const [surface, setSurface] = (0, import_react8.useState)("activity");
  const [openOwner, setOpenOwner] = (0, import_react8.useState)();
  const [autoOpened, setAutoOpened] = (0, import_react8.useState)(false);
  const [wasActive, setWasActive] = (0, import_react8.useState)(false);
  const [historic, setHistoric] = (0, import_react8.useState)(/* @__PURE__ */ new Map());
  const current = (0, import_react8.useSyncExternalStore)(sessionsList.subscribe, sessionsList.getSnapshot).current;
  const monitorTargets = (0, import_react8.useSyncExternalStore)(subscribeActivityMonitorTargets, getActivityMonitorTargetsSnapshot);
  const { teams, archivedTeams, controlPlaneEnabled } = (0, import_react8.useSyncExternalStore)(subscribeActivitySnapshots, getActivitySnapshotsSnapshot);
  const currentTargets = (0, import_react8.useMemo)(() => current === void 0 ? [] : monitorTargets.filter((target) => target.sessionId === current), [current, monitorTargets]);
  const currentRef = (0, import_react8.useRef)(current);
  (0, import_react8.useEffect)(() => {
    currentRef.current = current;
  }, [current]);
  const mountedAtRef = (0, import_react8.useRef)(performance.now());
  const expanded = open;
  (0, import_react8.useLayoutEffect)(() => {
    const root = document.documentElement;
    if (expanded)
      root.setAttribute(PANEL_OPEN_ATTRIBUTE, "");
    else
      root.removeAttribute(PANEL_OPEN_ATTRIBUTE);
    return () => {
      root.removeAttribute(PANEL_OPEN_ATTRIBUTE);
    };
  }, [expanded]);
  (0, import_react8.useEffect)(() => {
    const controller = startActivityPolling(currentTargets, { pollAll: current !== void 0 });
    return () => {
      controller.stop();
    };
  }, [current, currentTargets]);
  (0, import_react8.useEffect)(() => {
    const onOpenPanel = (event) => {
      const detail = event.detail;
      const cardOwner = detail?.captainSessionId;
      const owner = cardOwner !== void 0 && cardOwner !== "" ? cardOwner : currentRef.current;
      if (owner === void 0)
        return;
      setOpenOwner(owner);
      setSurface("activity");
      setOpen(true);
      if (detail?.teamId !== void 0) {
        const teamKey = `${owner}:${detail.teamId}`;
        setHistoric((previous) => {
          const next = new Map(previous);
          next.set(teamKey, { data: detail, owner });
          return next;
        });
      }
    };
    window.addEventListener(OPEN_PANEL_EVENT, onOpenPanel);
    return () => {
      window.removeEventListener(OPEN_PANEL_EVENT, onOpenPanel);
    };
  }, []);
  const visibleTeams = (0, import_react8.useMemo)(() => current === void 0 ? [] : teams.filter((team) => team.captainSessionId === current), [current, teams]);
  const visibleHistoric = (0, import_react8.useMemo)(() => [...historic.values()].filter(({ data, owner }) => owner === current && !visibleTeams.some((live) => live.teamId === data.teamId && live.captainSessionId === owner) && !archivedTeams.some((archived) => archived.captainSessionId === owner && archived.teamId === data.teamId)), [current, historic, visibleTeams, archivedTeams]);
  const visibleArchived = (0, import_react8.useMemo)(() => current === void 0 ? [] : archivedTeams.filter((team) => team.captainSessionId === current && !visibleTeams.some((live) => live.captainSessionId === team.captainSessionId && live.teamId === team.teamId)), [current, archivedTeams, visibleTeams]);
  const visibleCount = visibleTeams.length + visibleArchived.length + visibleHistoric.length;
  (0, import_react8.useEffect)(() => {
    if (visibleCount > 0) {
      setWasActive(true);
      const settled = performance.now() - mountedAtRef.current >= AUTO_OPEN_SETTLE_MS;
      if (!autoOpened && settled) {
        setOpenOwner(current);
        setOpen(true);
        setAutoOpened(true);
      }
      return;
    }
    if (!wasActive)
      return;
    const timer = setTimeout(() => {
      setOpen(false);
      setOpenOwner(void 0);
      setWasActive(false);
      setAutoOpened(false);
    }, AUTOCLOSE_GRACE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [visibleCount, autoOpened, wasActive]);
  const busy = (0, import_react8.useMemo)(() => visibleTeams.some((team) => team.members.some((member) => member.activity === "working")), [visibleTeams]);
  const hasTeams = visibleCount > 0;
  const toolClient = (0, import_react8.useMemo)(() => current === void 0 ? void 0 : createToolClient(current), [createToolClient, current]);
  (0, import_react8.useEffect)(() => {
    if (!controlPlaneEnabled && surface !== "activity")
      setSurface("activity");
  }, [controlPlaneEnabled, surface]);
  return (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [!expanded && (0, import_jsx_runtime7.jsx)(CollapsedBadge, { count: visibleCount, busy, onClick: () => {
    if (current === void 0)
      return;
    setOpenOwner(current);
    setOpen(true);
  } }), expanded && (0, import_jsx_runtime7.jsxs)("aside", { className: ActivityPanel_default.panel, "data-agent-teams-activity": true, children: [(0, import_jsx_runtime7.jsxs)("header", { className: ActivityPanel_default.panelHead, children: [(0, import_jsx_runtime7.jsxs)("span", { className: ActivityPanel_default.panelTitle, children: ["Agent Teams", (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.panelDot, "data-busy": busy, "aria-hidden": true })] }), (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.panelActions, children: (0, import_jsx_runtime7.jsx)("button", { type: "button", className: ActivityPanel_default.closeButton, onClick: () => {
    setOpen(false);
    setOpenOwner(void 0);
  }, "aria-label": "关闭", children: (0, import_jsx_runtime7.jsx)(import_dsh_client_ui_primitives.IconCloseOutline16, {}) }) })] }), (0, import_jsx_runtime7.jsxs)("div", { className: ActivityPanel_default.surfaceTabs, role: "tablist", "aria-label": "Agent Teams 视图", children: [(0, import_jsx_runtime7.jsx)("button", { type: "button", role: "tab", "aria-selected": surface === "activity", onClick: () => {
    setSurface("activity");
  }, children: "活动" }), controlPlaneEnabled && (0, import_jsx_runtime7.jsx)("button", { type: "button", role: "tab", "aria-selected": surface === "tools", onClick: () => {
    setSurface("tools");
  }, children: "工具库" }), controlPlaneEnabled && (0, import_jsx_runtime7.jsx)("button", { type: "button", role: "tab", "aria-selected": surface === "agents", onClick: () => {
    setSurface("agents");
  }, children: "我的 Agent" })] }), surface === "activity" ? (0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.teams, children: visibleCount === 0 ? (0, import_jsx_runtime7.jsx)("span", { className: ActivityPanel_default.emptyHint, children: "暂无团队活动" }) : (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: [
    ...visibleTeams.map((team) => ({ key: team.teamId, content: (0, import_jsx_runtime7.jsx)(TeamSection, { team, onNavigate: navigateToMember }) })),
    ...visibleArchived.map((team) => ({
      key: `${team.captainSessionId}:${team.teamId}`,
      content: (0, import_jsx_runtime7.jsx)("div", { "data-team-id": team.teamId, "data-historic": true, className: ActivityPanel_default.archivedWrap, children: (0, import_jsx_runtime7.jsx)(TeamSection, { team, onNavigate: navigateToMember, historic: true }) })
    })),
    ...visibleHistoric.map(({ data: team, owner }) => {
      const teamKey = `${owner}:${team.teamId}`;
      return { key: teamKey, content: (0, import_jsx_runtime7.jsx)(TeamSection, { team: historicCardTeam(team, owner), onNavigate: navigateToMember, historic: true }) };
    })
  ].map(({ key, content }, index) => (0, import_jsx_runtime7.jsxs)(import_react8.Fragment, { children: [index > 0 && (0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.teamDivider, "aria-label": "独立团队分隔", children: (0, import_jsx_runtime7.jsx)("span", { children: "独立团队" }) }), content] }, key)) }) }) : surface === "agents" && toolClient !== void 0 ? (0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.toolSurface, children: (0, import_jsx_runtime7.jsx)(AgentProfilesView, { client: toolClient }) }) : current === void 0 || toolClient === void 0 ? (0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.emptyHint, children: "请先打开一个 Agent 会话" }) : (0, import_jsx_runtime7.jsx)("div", { className: ActivityPanel_default.toolSurface, children: (0, import_jsx_runtime7.jsx)(ToolLibraryView, { sessionId: current, client: toolClient }) })] })] });
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/member-navigation.js
function catalogNavigationAddress(sessions, sessionId) {
  const direct = sessions.navigationAddress?.(sessionId);
  if (direct !== void 0)
    return direct;
  const manager = sessions.manager;
  return manager?.navigationAddress?.call(manager, sessionId);
}
async function openMemberSubagent(sessions, captainSessionId, memberSessionId) {
  await sessions.refreshSubagents(captainSessionId);
  const address = sessions.subagentAddress(memberSessionId) ?? catalogNavigationAddress(sessions, memberSessionId);
  if (address === void 0 || address.parentSessionId !== captainSessionId || address.childSessionId !== memberSessionId)
    return false;
  sessions.openSubagent(address);
  return true;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/tool-library-client.js
var TOOL_GATEWAY_PATH = "/plugins/dsh-agent-teams/tools";
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeToolProposal(value) {
  const response = record(value) ? value : void 0;
  const approval = response !== void 0 && record(response.approval) ? response.approval : response;
  const approvalId = typeof approval?.id === "string" ? approval.id : typeof approval?.approvalId === "string" ? approval.approvalId : void 0;
  const status = typeof approval?.status === "string" ? approval.status : void 0;
  if (approvalId === void 0 || !["pending", "approved", "rejected", "expired"].includes(status ?? "")) {
    throw new Error("工具审批响应无效");
  }
  return {
    proposalId: typeof response?.proposalId === "string" ? response.proposalId : approvalId,
    approvalId,
    status
  };
}
function idempotencyKey() {
  return `agent-teams:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
function toolUrl(sessionId, suffix = "") {
  const separator = suffix.includes("?") ? "&" : "?";
  return `${TOOL_GATEWAY_PATH}${suffix}${separator}sessionId=${encodeURIComponent(sessionId)}`;
}
function gatewayErrorMessage(payload) {
  const message = payload?.error?.message;
  return typeof message === "string" && message.length > 0 && message.length <= 160 ? message : "工具服务暂时无法完成请求";
}
async function request(sessionId, path, method, body) {
  const headers = { Accept: "application/json" };
  if (body !== void 0) {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = idempotencyKey();
  }
  const response = await globalThis.fetch(toolUrl(sessionId, path), {
    method,
    headers,
    ...body === void 0 ? {} : { body: JSON.stringify(body) }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false || payload === null)
    throw new Error(gatewayErrorMessage(payload));
  return payload.data ?? payload;
}
function createToolLibraryClient(sessionId) {
  return {
    listTools: () => request(sessionId, "", "GET"),
    getTool: (toolId, version) => request(sessionId, `/${encodeURIComponent(toolId)}${version ? `?version=${encodeURIComponent(version)}` : ""}`, "GET"),
    getHealth: (toolId, version) => request(sessionId, `/${encodeURIComponent(toolId)}/health${version ? `?version=${encodeURIComponent(version)}` : ""}`, "GET"),
    getTrialContext: () => request(sessionId, "/trial-context", "POST", {}),
    preflight: (toolId, version, input) => request(sessionId, `/${encodeURIComponent(toolId)}/preflight`, "POST", { version, input }),
    createProposal: async (toolId, version, input) => normalizeToolProposal(await request(sessionId, `/${encodeURIComponent(toolId)}/proposals`, "POST", { version, input, summary: "Agent Teams 工具库手动试用" })),
    decideApproval: async (approvalId, decision) => normalizeToolProposal(await request(sessionId, `/approvals/${encodeURIComponent(approvalId)}/decision`, "POST", { decision })),
    trial: (toolId, input) => request(sessionId, `/${encodeURIComponent(toolId)}/trial`, "POST", input),
    getCallStatus: (toolCallId) => request(sessionId, `/calls/${encodeURIComponent(toolCallId)}/status`, "GET"),
    listResources: (toolId) => request(sessionId, `/${encodeURIComponent(toolId)}/resources`, "GET"),
    resourceDownloadUrl: (toolId, resourceId) => toolUrl(sessionId, `/${encodeURIComponent(toolId)}/resources/${encodeURIComponent(resourceId)}/download`),
    listExperiences: (toolId) => request(sessionId, `/experiences${toolId ? `?toolId=${encodeURIComponent(toolId)}` : ""}`, "GET"),
    updateExperience: (id, changes) => request(sessionId, `/experiences/${encodeURIComponent(id)}`, "PATCH", changes),
    disableExperience: (id) => request(sessionId, `/experiences/${encodeURIComponent(id)}/disable`, "POST", {}),
    deleteExperience: (id) => request(sessionId, `/experiences/${encodeURIComponent(id)}`, "DELETE", {}),
    listAgentProfiles: (status) => request(sessionId, `/profiles${status ? `?status=${encodeURIComponent(status)}` : ""}`, "GET"),
    getAgentProfile: (id) => request(sessionId, `/profiles/${encodeURIComponent(id)}`, "GET"),
    updateAgentProfile: (id, update) => request(sessionId, `/profiles/${encodeURIComponent(id)}`, "PATCH", update),
    disableAgentProfile: (id) => request(sessionId, `/profiles/${encodeURIComponent(id)}/disable`, "POST", {}),
    listAgentMemories: (agentId) => request(sessionId, `/profiles/${encodeURIComponent(agentId)}/memory`, "GET"),
    disableAgentMemory: (agentId, memoryId) => request(sessionId, `/profiles/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(memoryId)}/disable`, "POST", {}),
    listSharedMemories: (status) => request(sessionId, `/shared-memory${status ? `?status=${encodeURIComponent(status)}` : ""}`, "GET"),
    decideSharedMemory: (id, decision, expectedVersion) => request(sessionId, `/shared-memory/${encodeURIComponent(id)}/decisions`, "POST", { decision, expectedVersion }),
    listSkillCandidates: (status) => request(sessionId, `/shared-memory/skill-candidates${status ? `?status=${encodeURIComponent(status)}` : ""}`, "GET"),
    decideSkillCandidate: (id, decision, expectedVersion) => request(sessionId, `/shared-memory/skill-candidates/${encodeURIComponent(id)}/decisions`, "POST", { decision, expectedVersion }),
    getProviderConfiguration: (providerId) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, "GET"),
    saveProviderConfiguration: (providerId, values) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, "PUT", values),
    deleteProviderConfiguration: (providerId) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, "DELETE", {}),
    testProviderConfiguration: (providerId) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/test`, "POST", {}),
    startProviderOAuth: (providerId) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/oauth/start`, "POST", {}),
    getFeishuConnection: () => request(sessionId, "/feishu/connection", "GET"),
    startFeishuOAuth: () => request(sessionId, "/feishu/oauth/start", "POST", {}),
    setFeishuDestination: (folderUrl) => request(sessionId, "/feishu/destination", "POST", { folderUrl }),
    disconnectFeishu: () => request(sessionId, "/feishu/disconnect", "POST", {}),
    getDouyinAccount: () => request(sessionId, "/douyin/account", "GET"),
    openEgoLite: () => request(sessionId, "/douyin/open-browser", "POST", {})
  };
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/session-artifact-downloads.js
var import_react9 = require("react");

// packages/opc-profile/agent-teams-desktop/source/lib/client/session-artifact-download-model.js
function buildSessionArtifactDownloadIndex(teams, captainSessionId) {
  if (captainSessionId === void 0)
    return /* @__PURE__ */ new Map();
  const indexed = /* @__PURE__ */ new Map();
  const ambiguous = /* @__PURE__ */ new Set();
  for (const team of teams) {
    if (team.captainSessionId !== captainSessionId)
      continue;
    const artifactGroups = [team.artifacts ?? [], ...team.tasks.map((task) => task.artifacts)];
    for (const artifacts of artifactGroups) {
      for (const artifact of artifacts) {
        const name = artifact.name.trim();
        const url = artifact.url.trim();
        if (name === "" || url === "" || ambiguous.has(name))
          continue;
        const existing = indexed.get(name);
        if (existing === void 0 || existing === url)
          indexed.set(name, url);
        else {
          indexed.delete(name);
          ambiguous.add(name);
        }
      }
    }
  }
  return indexed;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/session-artifact-download-target.js
function isHTMLElementLike(value) {
  return value !== null && typeof value === "object" && typeof value.closest === "function";
}
function closestCapable(value) {
  if (isHTMLElementLike(value)) {
    return value;
  }
  if (value !== null && typeof value === "object" && value.nodeType === 3) {
    return value.parentElement ?? null;
  }
  return null;
}
function decoratedCode(target) {
  return closestCapable(target)?.closest("code[data-agent-teams-download-url]") ?? null;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/session-artifact-downloads.js
var SESSION_ARTIFACT_DOWNLOAD_CLASS = ActivityPanel_default.sessionArtifactDownload;
function startDownload(code) {
  const url = code.dataset.agentTeamsDownloadUrl;
  const name = code.textContent?.trim();
  if (url === void 0 || name === void 0 || name === "")
    return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
function clearDecoration(code) {
  code.classList.remove(SESSION_ARTIFACT_DOWNLOAD_CLASS);
  delete code.dataset.agentTeamsDownloadUrl;
  code.removeAttribute("role");
  code.removeAttribute("tabindex");
  code.removeAttribute("aria-label");
  code.removeAttribute("title");
}
function decorateSessionArtifacts(index) {
  const codes = document.querySelectorAll("code");
  for (const code of codes) {
    const name = code.textContent?.trim() ?? "";
    const url = code.closest("[data-agent-teams-host], a, button, pre") === null ? index.get(name) : void 0;
    if (url === void 0) {
      if (code.dataset.agentTeamsDownloadUrl !== void 0)
        clearDecoration(code);
      continue;
    }
    if (code.dataset.agentTeamsDownloadUrl === url)
      continue;
    code.classList.add(SESSION_ARTIFACT_DOWNLOAD_CLASS);
    code.dataset.agentTeamsDownloadUrl = url;
    code.setAttribute("role", "link");
    code.tabIndex = 0;
    code.setAttribute("aria-label", `下载 ${name}`);
    code.title = `下载 ${name}`;
  }
}
function SessionArtifactDownloads({ sessionsList }) {
  const current = (0, import_react9.useSyncExternalStore)(sessionsList.subscribe, sessionsList.getSnapshot).current;
  const { teams, archivedTeams } = (0, import_react9.useSyncExternalStore)(subscribeActivitySnapshots, getActivitySnapshotsSnapshot);
  const index = (0, import_react9.useMemo)(() => buildSessionArtifactDownloadIndex([...teams, ...archivedTeams], current), [teams, archivedTeams, current]);
  (0, import_react9.useEffect)(() => {
    let queued = false;
    const decorate = () => {
      if (queued)
        return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        decorateSessionArtifacts(index);
      });
    };
    const onClick = (event) => {
      const code = decoratedCode(event.target);
      if (code === null)
        return;
      event.preventDefault();
      event.stopPropagation();
      startDownload(code);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Enter" && event.key !== " ")
        return;
      const code = decoratedCode(event.target);
      if (code === null)
        return;
      event.preventDefault();
      event.stopPropagation();
      startDownload(code);
    };
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    decorate();
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      for (const code of document.querySelectorAll("code[data-agent-teams-download-url]"))
        clearDecoration(code);
    };
  }, [index]);
  return null;
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/InterviewGuidePanel.js
var import_jsx_runtime8 = require("react/jsx-runtime");
var import_react10 = require("react");
var import_react_dom = require("react-dom");
var ACTIONS = [
  ["认识 Evan", "先用简单的话介绍你能帮我做什么。"],
  ["认识我的生意", "请用一问一答了解我的称呼、行业和主营业务。"],
  ["建立第二大脑", "请介绍本地第二大脑，征得我同意后再创建。"],
  ["完善公司资料", "请继续帮我补充公司资料，每次只问一个问题。"]
];
var dismissed = /* @__PURE__ */ new WeakSet();
var controlStyle = { border: "1px solid #d8dee8", borderRadius: 10, padding: "12px 16px", background: "#fff", color: "#1d2736", cursor: "pointer" };
function isInterviewSession(summary) {
  const cwd = typeof summary?.cwd === "string" ? summary.cwd.replaceAll("\\", "/") : "";
  return cwd.endsWith("/访谈") || summary?.title === "访谈";
}
function InterviewGuidePanel({ sessionId, inputActions, input, useSessions }) {
  const summary = useSessions((state) => state.byId[sessionId]);
  const [, refresh] = (0, import_react10.useState)(0);
  const [error, setError] = (0, import_react10.useState)("");
  const panelRef = (0, import_react10.useRef)(null);
  const eligible = isInterviewSession(summary) && inputActions !== void 0;
  const visible = eligible && !dismissed.has(inputActions);
  (0, import_react10.useEffect)(() => {
    if (!visible) return;
    const previous = document.activeElement;
    panelRef.current?.querySelector("button")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus?.();
    };
  }, [visible, sessionId]);
  if (!eligible) return null;
  const close = () => {
    dismissed.add(inputActions);
    setError("");
    refresh((value) => value + 1);
  };
  if (!visible) return (0, import_jsx_runtime8.jsx)("button", {
    type: "button",
    style: controlStyle,
    onClick: () => {
      dismissed.delete(inputActions);
      refresh((value) => value + 1);
    },
    children: "继续访谈引导"
  });
  const hasDraft = Boolean(input?.draft?.trim() || input?.imageIds?.length);
  const busy = !input || input.phase !== "plain";
  const disabled = hasDraft || busy;
  const send = (text) => {
    if (disabled) return;
    try {
      inputActions.setDraft(text);
      inputActions.submit();
      close();
    } catch {
      setError("暂时无法提交，请进入对话检查输入内容后重试。");
    }
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
    if (event.key !== "Tab") return;
    const controls = [...panelRef.current.querySelectorAll("button:not(:disabled)")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return (0, import_react_dom.createPortal)((0, import_jsx_runtime8.jsxs)("section", {
    ref: panelRef,
    role: "dialog",
    "aria-modal": true,
    "aria-label": "访谈引导",
    className: "opc-interview-guide",
    onKeyDown,
    style: { position: "fixed", inset: 0, zIndex: 2147483647, boxSizing: "border-box", overflowY: "auto", padding: "72px 24px 32px", background: "#f7f8fa", color: "#1d2736" },
    children: [
      (0, import_jsx_runtime8.jsx)("button", { type: "button", onClick: close, style: { ...controlStyle, position: "absolute", top: 20, right: 24 }, children: "进入对话" }),
      (0, import_jsx_runtime8.jsxs)("div", { style: { maxWidth: 720, minHeight: "calc(100% - 32px)", margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }, children: [
        (0, import_jsx_runtime8.jsxs)("header", { style: { display: "grid", gap: 12 }, children: [
          (0, import_jsx_runtime8.jsx)("span", { style: { color: "#6b7484", fontSize: 13, letterSpacing: "0.08em" }, children: "Evan超级管家 · 首次引导" }),
          (0, import_jsx_runtime8.jsx)("h1", { style: { margin: 0, fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.15, fontWeight: 650 }, children: "我们先认识一下" }),
          (0, import_jsx_runtime8.jsx)("p", { style: { margin: 0, maxWidth: 560, color: "#596579", fontSize: 17, lineHeight: 1.7 }, children: "我会边听边了解你的生意，帮你建立可持续使用的工作资料。选择一段开始，也可以进入对话自由输入或使用语音。" })
        ] }),
        (0, import_jsx_runtime8.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 12 }, children: ACTIONS.map(([label, text], index) => (0, import_jsx_runtime8.jsxs)("button", {
          type: "button",
          disabled,
          onClick: () => send(text),
          style: { ...controlStyle, minHeight: 84, display: "grid", gap: 8, textAlign: "left", opacity: disabled ? 0.55 : 1, cursor: disabled ? "not-allowed" : "pointer" },
          children: [(0, import_jsx_runtime8.jsx)("strong", { style: { fontSize: 16 }, children: label }), (0, import_jsx_runtime8.jsx)("span", { style: { color: "#6b7484", fontSize: 12 }, children: `${index + 1} / 4 · 点击开始这一段` })]
        }, label)) }),
        disabled && (0, import_jsx_runtime8.jsx)("p", { role: "status", children: hasDraft ? "已有未发送的内容，请先进入对话处理。" : "输入框正在处理请求，请进入对话查看进度。" }),
        error && (0, import_jsx_runtime8.jsx)("p", { role: "alert", style: { color: "#a32222" }, children: error }),
        (0, import_jsx_runtime8.jsx)("button", { type: "button", onClick: close, style: { border: 0, background: "transparent", padding: "12px 0", alignSelf: "flex-start", color: "#596579", cursor: "pointer" }, children: "稍后继续，先进入对话" })
      ] })
    ]
  }), document.body);
}

// packages/opc-profile/agent-teams-desktop/source/lib/client/index.js
var inject = ["slots", "sessions"];
function apply(ctx) {
  const host = document.createElement("div");
  host.dataset.agentTeamsHost = "";
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  root.render((0, import_jsx_runtime9.jsxs)(import_react11.Fragment, { children: [(0, import_jsx_runtime9.jsx)(ActivityPanel, { sessionsList: ctx.sessions.list, openMemberSession: (captainSessionId, memberSessionId) => openMemberSubagent(ctx.sessions, captainSessionId, memberSessionId), createToolClient: createToolLibraryClient }), (0, import_jsx_runtime9.jsx)(SessionArtifactDownloads, { sessionsList: ctx.sessions.list })] }));
  ctx.effect(() => () => {
    root.unmount();
    host.remove();
  }, "agent-teams: activity panel");
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "agent-teams",
    inject: () => ({
      openMemberSession: (captainSessionId, memberSessionId) => openMemberSubagent(ctx.sessions, captainSessionId, memberSessionId)
    })
  }, AgentTeamsCard));
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "agent-teams-interview-guide",
    order: 20
  }, InterviewGuidePanel));
}
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/archive.js:
lucide-react/dist/esm/icons/audio-lines.js:
lucide-react/dist/esm/icons/ban.js:
lucide-react/dist/esm/icons/bot.js:
lucide-react/dist/esm/icons/brain.js:
lucide-react/dist/esm/icons/check.js:
lucide-react/dist/esm/icons/chevron-right.js:
lucide-react/dist/esm/icons/circle-check.js:
lucide-react/dist/esm/icons/circle-dollar-sign.js:
lucide-react/dist/esm/icons/circle-dot.js:
lucide-react/dist/esm/icons/clapperboard.js:
lucide-react/dist/esm/icons/copy.js:
lucide-react/dist/esm/icons/download.js:
lucide-react/dist/esm/icons/earth.js:
lucide-react/dist/esm/icons/external-link.js:
lucide-react/dist/esm/icons/eye-off.js:
lucide-react/dist/esm/icons/eye.js:
lucide-react/dist/esm/icons/file-check-2.js:
lucide-react/dist/esm/icons/file-text.js:
lucide-react/dist/esm/icons/heart-pulse.js:
lucide-react/dist/esm/icons/image.js:
lucide-react/dist/esm/icons/lightbulb.js:
lucide-react/dist/esm/icons/message-circle.js:
lucide-react/dist/esm/icons/monitor-cog.js:
lucide-react/dist/esm/icons/pencil.js:
lucide-react/dist/esm/icons/refresh-cw.js:
lucide-react/dist/esm/icons/rotate-ccw.js:
lucide-react/dist/esm/icons/save.js:
lucide-react/dist/esm/icons/search.js:
lucide-react/dist/esm/icons/send.js:
lucide-react/dist/esm/icons/settings.js:
lucide-react/dist/esm/icons/smartphone.js:
lucide-react/dist/esm/icons/sparkles.js:
lucide-react/dist/esm/icons/triangle-alert.js:
lucide-react/dist/esm/icons/video.js:
lucide-react/dist/esm/icons/wrench.js:
lucide-react/dist/esm/icons/x.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
return module.exports; } });
//# sourceMappingURL=client.js.map
