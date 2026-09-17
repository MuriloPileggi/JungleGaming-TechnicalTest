import { useNavigate } from 'react-router-dom';
import { GameCanvas } from '../components/GameCanvas';
import { quitStyle } from './Styles';

export default function GameScreen() {
  const navigate = useNavigate();
  return (
    <>
      <GameCanvas />
      <button style={quitStyle} onClick={() => navigate('/')}>
        Quit to menu
      </button>
    </>
  );
}
