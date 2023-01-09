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
}

const COLORS = {
    primary: colorNames.red,
    secondary: colorNames.pink,
    terceary: colorNames.gray,
    brightness: colorNames.snow,
    extra: colorNames.pinkShadow,
    text: colorNames.black,
    border: "2px solid",
    bodyColor: colorNames.pinkShadow,
    bgColor: colorNames.pink,
    titleColor: colorNames.red,
    titleShadow: colorNames.pinkShadow,
};

const DARKCOLORS = {
    primary: colorNames.black,
    secondary: colorNames.shadow,
    terceary: colorNames.mediumGray,
    brightness: colorNames.gray,
    extra: colorNames.pink,
    text: colorNames.snow,
    border: "2px solid",
    bodyColor: colorNames.darkGray,
    bgColor: colorNames.shadow,
    titleColor: colorNames.pinkShadow,
    titleShadow: colorNames.darkGray,
}



export { COLORS, DARKCOLORS };
