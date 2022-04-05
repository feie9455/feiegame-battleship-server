-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- 主机： 127.0.0.1
-- 生成日期： 2022-04-04 16:11:37
-- 服务器版本： 10.4.20-MariaDB
-- PHP 版本： 8.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `feiegame_battleship`
--

-- --------------------------------------------------------

--
-- 表的结构 `savesmap`
--

CREATE TABLE `savesmap` (
  `name` text NOT NULL,
  `uuid` text NOT NULL,
  `blueState` int(11) NOT NULL DEFAULT 0,
  `redState` int(11) NOT NULL DEFAULT 0,
  `gameState` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- 转存表中的数据 `savesmap`
--

INSERT INTO `savesmap` (`name`, `uuid`, `blueState`, `redState`, `gameState`) VALUES
('沈阳大街', '8e46d777-94ca-456b-bd2b-81dff2c461b3', 2, 2, 0),
('休伯利安', '001dffff-bae9-4e3c-9758-3b51e9bc2ef0', 2, 2, 0),
('xmcの房间', '8eace2e7-2a2e-4527-98f3-7606e72684b6', 2, 2, 0),
('xmcの房间', '603d19cb-562f-471b-a51e-27ef7dfea6e7', 2, 2, 0),
('xmcの房间', '82713ac4-fbca-4066-8de7-abce8b49e49d', 2, 2, 0),
('xmcの房间', '0f5d0fd6-b7b0-44d4-82b0-4c48bd8b733f', 2, 2, 0),
('xmcの房间', 'e9e95ac4-9fe1-45d6-a37a-5ccfb694f264', 2, 2, 0),
('xmcの房间', '46b590a4-dd9e-4382-8ff7-c8e989917105', 2, 2, 0),
('xmcの房间', 'c193673c-9e47-49af-a053-f411431b06d6', 2, 2, 0),
('璨泥马の房间', '3200eb5a-f491-4ab7-a783-39016edce048', 2, 2, 0),
('璨泥马の房间2', 'a92b7bc4-944d-4966-b9e1-1addfea445cc', 2, 2, 0),
('feie9454的房间', '33a0a66f-a5db-4bca-a89d-9c2935ff81a1', 2, 2, 0),
('璨泥马の房间10086', '22a805c6-3e59-405e-82a1-ee303ecb333e', 2, 2, 0),
('cao', 'cc2b065b-a8c4-4354-829d-ad14b78f7a7c', 2, 2, 0),
('cao', '744c7e29-5676-4340-8bc0-cbba422a4ad7', 2, 2, 0),
('沈阳大街', '7b981a16-692a-4d3b-b904-9dd9a1680629', 2, 2, 0),
('沈阳大街', '1d998aeb-bea2-4434-aed3-de978207a50b', 2, 2, 0),
('沈阳大街', '273c6c9c-1044-4381-9402-398b274f204a', 2, 2, 0),
('沈阳大街', '4c89d1b3-a129-4c48-9527-0f4337d6aaa3', 2, 2, 0),
('helloworld', '9e7f9537-46e0-49d5-8bda-76593d3f8f8f', 2, 2, 0),
('helloworld', '3151da75-d2dc-41e0-80e7-0aa4dcbe5587', 2, 0, 0);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
