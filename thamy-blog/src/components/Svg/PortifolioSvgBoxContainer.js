import * as React from 'react';
import styled from 'styled-components';

import SvgBox from './PortifolioSvgBox';

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
`

const SvgContainer = () => {
    return (
        <Container>
            <SvgBox
                animDelay={"100ms"}
                svgCircleColor={"#051C2C"}
                colorList={[
                    {text: "Pantone 296 C", id: "pan_296_C"},
                    {text: "R5 G28 B44", id: "rgb_5_28_44"},
                    {text: "C100 M46 Y0 K89", id: "cmyk_100_46_0_89"},
                    {text: "#051C2C", id: "hex_051C2C"}]}></SvgBox>
            <SvgBox
                animDelay={"200ms"}
                svgCircleColor={"#00344F"}
                colorList={[
                    {text: "Pantone 2965 CP", id: "pan_2965_CP"},
                    {text: "R0 G52 B79", id: "rgb_0_52_49"},
                    {text: "C100 M40 Y0 K82", id: "cmyk_100_40_0_82"},
                    {text: "#00344F", id: "hex_00344F"}]}></SvgBox>
            <SvgBox
                animDelay={"300ms"}
                svgCircleColor={"#FFE900"}
                colorList={[
                    {text: "Pantone 803 C", id: "pan_803_C"},
                    {text: "R255 G233 B0", id: "rgb_255_233_0"},
                    {text: "C0 M3 Y97 K0", id: "cmyk_0_3_97_0"},
                    {text: "#FFE900", id: "hex_FFE900"}]}></SvgBox>
            <SvgBox
                animDelay={"400ms"}
                svgCircleColor={"#008ECC"}
                colorList={[
                    {text: "Pantone 2394 CP", id: "pan_2394_CP"},
                    {text: "R0 G142 B204", id: "rgb_0_142_204"},
                    {text: "C100 M14 Y0 K1", id: "cmyk_100_14_0_1"},
                    {text: "#008ECC", id: "hex_008ECC"}]}></SvgBox>
            <SvgBox
                animDelay={"500ms"}
                svgCircleColor={"#42ADD5"}
                colorList={[
                    {text: "Pantone 16-4530 TPG", id: "pan_16-4530_TPG"},
                    {text: "R65 G173 B212", id: "rgb_65_173_212"},
                    {text: "C68 M12 Y10 K0", id: "cmyk_68_12_10_0"},
                    {text: "#42ADD5", id: "hex_42ADD5"}]}></SvgBox>
            <SvgBox
                animDelay={"600ms"}
                svgCircleColor={"#FCF6F5"}
                colorList={[
                    {text: "Pantone P 75-1 U", id: "pan_P_75-1_U"},
                    {text: "R252 G246 B245", id: "rgb_252_246_245"},
                    {text: "C0 M2 Y0 K0", id: "cmyk_0_2_0_0"},
                    {text: "#FCF6F5", id: "hex_FCF6F5"}]}></SvgBox>
        </Container>
    )
}

export default SvgContainer;
