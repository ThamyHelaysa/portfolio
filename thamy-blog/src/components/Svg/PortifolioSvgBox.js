import * as React from 'react';
import styled from 'styled-components';

import FONTS from '../../constants/fonts';

import GlitchCircle from './GlitchCircle';

const Container = styled.div`
    position: relative;
`

const InfoBox = styled.div`
    position: relative;
    display: inline-block;
    margin-top: -50%;
    padding: 1rem;
    background-color: ${(props) => props.theme.colors.preCodeBg};
    color: ${(props) => props.theme.colors.preCodeColor};
    font-family: ${FONTS.emphasis.fontFamily};
    font-size: 14px;
    & > span {
        display: block;
    }
`

const SvgBox = ({ colorList, children, svgCircleColor, animDelay }) => {
    return (
        <Container>
            <GlitchCircle $animDelay={ animDelay } $svgCircleColor={ svgCircleColor } />
            <InfoBox>
                {colorList.map((item,i) => (
                    <span key={item.id}>{item.text}</span>
                ))}
            </InfoBox>
        </Container>
    )
}

export default SvgBox;
