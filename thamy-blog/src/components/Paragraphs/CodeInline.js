import * as React from 'react';
import styled from "styled-components";


const Block = styled.code`
    display: inline;
    padding: 4.5px 6px;
    padding-inline-start: 0;
    background-color: ${(props) => props.theme.colors.preCodeBg};
    color: ${(props) => props.theme.colors.preCodeColor};
    letter-spacing: -0.5px;
    word-break: break-word;
`

const Code = ({ children }) => {
    return (
        <Block>
            {children}
        </Block>
    )
}

export default Code
