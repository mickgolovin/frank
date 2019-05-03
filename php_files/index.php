<form method="post">
    <input type="hidden" name="test_post" value="112233445566">
    <button type="submit" name="button">go</button>
</form>

<?php
echo '<pre>';
print_r($_SERVER);
print_r($_POST);
print_r($_GET);
echo '</pre>';
echo phpinfo();
?>
