import * as React from 'react';
import styled, { keyframes } from 'styled-components';

const scroll = keyframes`
    0% {
        transform: translateX(0%);
    }
    100% {
        transform: translateX(-100%);
    }
`

const Wrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    margin-bottom: -4px;
    background-color: ${(props) => props.theme.colors.darkness};
    color: ${(props) => props.theme.colors.brightness};
    overflow-x: hidden;
    z-index: 7;
`

const Container = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    animation: ${scroll} 103.141s linear 0s infinite;
    animation-play-state: running;
    animation-delay: 0s;
    animation-direction: normal;
`

const Box = styled.p`
    display: inline-block;
    margin: 1rem;
    font-size: ${(props) => props.theme.fonts.mediumTitle.fontSize};
    font-weight: ${(props) => props.theme.fonts.mediumTitle.fontWeight};
    white-space: nowrap;

`

const TextCarrossel = ({ children }) => {
    return (
        <Wrapper>
            <Container>
                <Box>{children}</Box>
            </Container>
            <Container>
                <Box>{children}</Box>
            </Container>
            <Container>
                <Box>{children}</Box>
            </Container>
        </Wrapper>
    )
}

export default TextCarrossel
