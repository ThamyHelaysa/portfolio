import * as ReactDOM from 'react-dom/client';

const browserHydrateFunction = () => {
  return (element, container) => {
    const root = ReactDOM.createRoot(container);
    root.render(element);
  };
};

export default browserHydrateFunction;