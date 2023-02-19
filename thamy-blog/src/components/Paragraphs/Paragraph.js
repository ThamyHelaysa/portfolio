import * as React from 'react';
import styled from 'styled-components';

import FONTS from '../../constants/fonts';

const StyledParagraph = styled.p`
    padding: 1.5rem 0;
    font-family: ${FONTS.paraGraphs.fontFamily};
    letter-spacing: 1px;
    line-height: 2;
`

const Paragraph = (props) => {
    return (
        <StyledParagraph {...props}>
            {props.children}
        </StyledParagraph>
    )
}

export { Paragraph, StyledParagraph };
