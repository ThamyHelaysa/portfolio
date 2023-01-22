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
    yellow: "#FFE900",
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
    hrColor: colorNames.text,

    bodyColor: colorNames.white,
    bgColor: colorNames.white,

    titleColor: colorNames.red,
    titleBg: "transparent",
    titleShadowGlow: colorNames.lavander,
    titleShadowGlowWhite: colorNames.lavander,

    quoteBg: colorNames.pink300,
    quoteColor: colorNames.pink900,

    preCodeBg: colorNames.lavander,
    preCodeColor: colorNames.pink900,

    emphaticPProject: colorNames.yellow,
    emphaticPProjectColor: colorNames.blue500,
    emphaticPProjectBg: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACtJREFUKFNjZCASMBKpjoEOChl51P+DnPP/y00U2zCsJlohLs/RwTO4rAYAVfMICzh1upIAAAAASUVORK5CYII=)",
    emphaticPProjectBg2: colorNames.white,
    emphaticPProjectBorder: colorNames.white,
    emphaticPProjectBorder2: colorNames.blue500,

    imageFilter: "invert(0)"
};

const DARKCOLORS = {
    primary: colorNames.black,
    secondary: colorNames.shadow,
    terceary: colorNames.mediumGray,

    brightness: colorNames.blue500,
    darkness: colorNames.blue200,

    extra: colorNames.red,
    text: colorNames.blue200,
    
    border: `2px solid ${colorNames.blue400}`,
    hrColor: colorNames.blue400,

    bodyColor: colorNames.blue700,
    bgColor: colorNames.blue700,

    titleColor: colorNames.red,
    titleBg: "transparent",
    titleShadowGlow: colorNames.pink700,
    titleShadowGlowWhite: colorNames.fullWhite,

    quoteBg: colorNames.blue500,
    quoteColor: colorNames.blue50,

    preCodeBg: colorNames.blue900,
    preCodeColor: colorNames.blue300,

    emphaticPProject: colorNames.yellow,
    emphaticPProjectColor: colorNames.blue500,
    emphaticPProjectBg: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACtJREFUKFNjZCASMBKpjoEOCn1DM/6DnLN59QwU2zCsJlohLs/RwTO4rAYAY1MIC6709vYAAAAASUVORK5CYII=)",
    emphaticPProjectBg2: colorNames.fullWhite,
    emphaticPProjectBorder: colorNames.blue700,
    emphaticPProjectBorder2: colorNames.blue400,

    imageFilter: "invert(1)"
}



export { COLORS, DARKCOLORS };
