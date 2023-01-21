import * as React from 'react';
import styled, { keyframes } from 'styled-components';

import CircleSVG from '../../images/circle.inline.svg';

const glitchAnimation = keyframes`
  0% {
    filter: url("#squiggly-0");
  }
  25% {
    filter: url("#squiggly-1");
  }
  50% {
    filter: url("#squiggly-2");
  }
  75% {
    filter: url("#squiggly-3");
  }
  100% {
    filter: url("#squiggly-4");
  }
`

const GlitchCircle = styled(CircleSVG)`
  animation: ${glitchAnimation} 0.3s infinite ${(props) => props.$animDelay };
  & > circle {
    fill: ${(props) => props.$svgCircleColor};
  }
`

export default GlitchCircle;
