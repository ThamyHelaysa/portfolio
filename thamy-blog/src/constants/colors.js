const colorNames = {
    black: "#0D0D0D", //#060930 #0D0D0D #311D3F
    shadow: "#262626", // #333456 #262626 #522546
    darkGray: "#333333", // #595B83 #333333 #88304E
    mediumGray: "#595959",
    gray: "#A6A6A6",
    snow: "#D9D9D9",
    red: "#D91A2A",
    pink: "#F2C2CB",
    pinkShadow: "#D9ADB5",

    lavander: "#cfb6e3",
    yellow: "#f69c55",
    peach: "#f47d84",
    lightPink: "#f276c8",
    neonPink: "#ef4e79",
    darkPink: "#b23653",
    wine: "#741631",
    darkBlue: "#010c27",
    white: "#f3ece5",
    fullWhite: "#FFFFFF",

    blue50: "#f2f3f4",
    blue100: "#e6e7e9",
    blue200: "#c0c2c9",
    blue300: "#999ea9",
    blue400: "#4d5568",
    blue500: "#010c27", // Main color
    blue700: "#01091d",
    blue900: "#000613",

    pink50: "#fef6f8",
    pink100: "#fdedf2",
    pink200: "#fbd3de",
    pink300: "#f9b8c9",
    pink400: "#f483a1",
    pink500: "#ef4e79", // Main color
    pink700: "#b33b5b",
    pink900: "#75263b",

}


const COLORS = {
    primary: colorNames.red,
    secondary: colorNames.pink,
    terceary: colorNames.gray,

    brightness: colorNames.white,
    darkness: colorNames.darkBlue,

    extra: colorNames.red,
    text: colorNames.blue500,

    border: "2px solid",

    bodyColor: colorNames.white,
    bgColor: colorNames.white,

    titleColor: colorNames.white,
    titleShadowGlow: colorNames.lavander,
    titleShadowGlowWhite: colorNames.lavander
};

const DARKCOLORS = {
    primary: colorNames.black,
    secondary: colorNames.shadow,
    terceary: colorNames.mediumGray,

    brightness: colorNames.blue500,
    darkness: colorNames.white,

    extra: colorNames.red,
    text: colorNames.white,
    
    border: `2px solid ${colorNames.blue400}`,

    bodyColor: colorNames.blue500,
    bgColor: colorNames.blue500,

    titleColor: colorNames.red,
    titleShadowGlow: colorNames.pink700,
    titleShadowGlowWhite: colorNames.fullWhite
}



export { COLORS, DARKCOLORS };
