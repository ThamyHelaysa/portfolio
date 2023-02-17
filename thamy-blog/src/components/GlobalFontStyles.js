import * as React from 'react'
import { createGlobalStyle } from 'styled-components'


const Container = createGlobalStyle`

    @font-face {
        font-family: ${(props) => props.theme.fonts.bigTitle.fontFamily};
        font-weight: ${(props) => props.theme.fonts.bigTitle.fontWeight};
        font-style: normal;
        src: url(${(props) => props.theme.fonts.bigTitle.source}) format(${(props) => props.theme.fonts.bigTitle.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${(props) => props.theme.fonts.paraGraphs.fontFamily};
        font-weight: ${(props) => props.theme.fonts.paraGraphs.fontWeight};
        font-style: normal;
        src: url(${(props) => props.theme.fonts.paraGraphs.source}) format(${(props) => props.theme.fonts.paraGraphs.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${(props) => props.theme.fonts.paraGraphsBold.fontFamily};
        font-weight: ${(props) => props.theme.fonts.paraGraphsBold.fontWeight};
        font-style: bold;
        src: url(${(props) => props.theme.fonts.paraGraphsBold.source}) format(${(props) => props.theme.fonts.paraGraphsBold.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${(props) => props.theme.fonts.paraGraphsBoldItalic.fontFamily};
        font-weight: ${(props) => props.theme.fonts.paraGraphsBoldItalic.fontWeight};
        font-style: italic;
        src: url(${(props) => props.theme.fonts.paraGraphsBoldItalic.source}) format(${(props) => props.theme.fonts.paraGraphsBoldItalic.forMat});
        font-display: swap;
    }
    @font-face {
        font-family: ${(props) => props.theme.fonts.emphasis.fontFamily};
        font-weight: ${(props) => props.theme.fonts.emphasis.fontWeight};
        font-style: normal;
        src: url(${(props) => props.theme.fonts.emphasis.source}) format(${(props) => props.theme.fonts.emphasis.forMat});
        font-display: swap;
    }

`

const GlobalFontStyle = () => {
    return (
        <Container />
    )
}

export default GlobalFontStyle;
