import * as React from 'react';
import styled from 'styled-components';


const Content = styled.p`
    position: relative;
    display: flex;
    flex-flow: row wrap;
    margin: 5rem auto;
    padding: 7rem 0;
    font-size: 5rem;
    font-weight: bold;
    text-align: left;
    line-height: 7rem;

    &::before {
        position: absolute;
        display: block;
        content: '';
        top: 0;
        left: 50%;
        width: calc(100vw - 32px);
        height: 100%;
        background: ${(props) => props.theme.colors.emphaticPProjectBg};
        background-color: ${(props) => props.theme.colors.emphaticPProjectBorder};
        border: ${(props) => props.theme.colors.border};
        box-shadow: inset 0 0 0 10px ${(props) => props.theme.colors.emphaticPProjectBorder};
        transform: translateX(-50%);
    }

`

const SpecialSpan = styled.span`
    position: relative;
    display: inline-block;
    padding: 5px 10px;
    background: ${(props) => props.theme.colors.emphaticPProject};
    border: 1px solid ${(props) => props.theme.colors.brightness};
    color: ${(props) => props.theme.colors.emphaticPProjectColor};
`

const EmphaticParagraph = () => {
    return (
        <Content>
            <SpecialSpan>Its cool</SpecialSpan>
            <SpecialSpan>when the</SpecialSpan>
            <SpecialSpan>execution</SpecialSpan>
            <SpecialSpan>matches</SpecialSpan>
            <SpecialSpan>the ideia</SpecialSpan>
        </Content>
    )
}

export default EmphaticParagraph;
